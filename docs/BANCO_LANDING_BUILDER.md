# Banco de Dados — Landing Page Builder

> 2026-11-11 · Status: **Etapa 1 escrita em 2026-11-11** (migração `20261111160000_landing_pages_management.sql` e script `supabase/RODAR_NO_SQL_EDITOR_landing_etapa1.sql`); ainda **não aplicada** no banco remoto. As demais etapas seguem como proposta. Complementa [MODELO_BANCO_DADOS §4.4](MODELO_BANCO_DADOS.md).
> Regra do projeto: migração em banco remoto só com a sua autorização; eu entrego o script e você roda no SQL Editor.

## 1. O que o PRD sugere × o que já existe

| Tabela sugerida no PRD | Decisão | Motivo |
|---|---|---|
| `landing_pages` | **Não criar.** Usar `pages` com `kind = 'landing'`. | A tabela já tem slug único, status, rascunho e ponteiro para a versão publicada. |
| `landing_page_versions` | **Não criar.** Usar `page_versions`. | Já guarda uma cópia imutável por publicação. |
| `landing_page_media` | **Não criar.** Usar `media_assets` + bucket `site-media`. | Já existe e já é usado pela Home. |
| `landing_page_templates` | **Não criar na v1.** Templates ficam no repositório. | Versionados junto com o renderizador; evita template incompatível com o código. |
| `landing_page_forms` | Criar como `forms` + `form_fields` (Etapa 8). | Formulário pertence ao módulo Formulários e pode ser usado em mais de uma página. |
| `landing_page_submissions` | Criar como `form_submissions` (Etapa 8). | Idem; já desenhada no modelo geral. |
| `landing_page_events` | Criar como `page_events` (Etapa 9, opcional). | Só se a coleta de visitas for aprovada. |

## 2. Etapa 1 — migração `landing_pages_management`

Só funções e uma coluna; nenhuma tabela nova.

**Coluna nova em `pages`:** `archived_at timestamptz` (data do arquivamento, para relatórios).

**Funções (todas `security definer`, `search_path = ''`, exigem `admin`):**

| Função | Faz |
|---|---|
| `create_landing_page(p_title, p_slug, p_document)` | Valida slug e documento, cria a página em rascunho. Erro claro se o slug já existir. |
| `duplicate_page(p_page_id, p_title, p_slug)` | Copia o rascunho para uma nova página em rascunho. |
| `update_page_meta(p_page_id, p_title, p_slug)` | Renomeia e troca o slug. Página publicada só troca de slug com confirmação explícita (parâmetro), porque o endereço público muda. |
| `unpublish_page(p_page_id)` | `status = 'unpublished'`; a versão publicada continua guardada. |
| `archive_page(p_page_id)` / `restore_page(p_page_id)` | Arquiva (sai do ar e da lista padrão) e restaura como rascunho. |
| `delete_page(p_page_id)` | Só para `landing` (nunca a Home). Apaga página e versões. Envios de formulário **não** são apagados: a FK é `on delete set null` e o envio guarda o título e o slug da época. |
| `list_landing_pages()` | Lista para a tela de gerenciamento, sem o documento. A contagem de leads entra na Etapa 8, quando `form_submissions` existir. |

**Ajustes:**

- `assert_page_document` passa a aceitar `schemaVersion` 1 ou 2 e a checar, na v2, que `blocks` é uma lista, que cada bloco tem `id` e `type`, o total de blocos (≤ 200) e a profundidade (≤ 4).
- `ensure_home_page` e `save_page_draft` passam a exigir v1 na Home e v2 nas landing pages.
- Slug: mantém o formato atual (`^[a-z0-9]+(-[a-z0-9]+)*$`, 3 a 80). Com `/lp/:slug` não é preciso lista de reservados.
- Auditoria: publicar, despublicar, arquivar e excluir gravam em `audit_logs` (tabela prevista no modelo geral e ainda não criada). **Ficou para a etapa de produção:** a migração da Etapa 1 não cria `audit_logs`.

## 3. Etapa 7 — leitura pública

```sql
-- Devolve só a versão PUBLICADA; nada de rascunho, nada de dados internos.
get_public_page(p_slug text) returns jsonb
```

- `security definer`, executável por `anon`.
- Retorna `null` para slug inexistente, página em rascunho, despublicada ou arquivada (a rota mostra 404).
- Retorna o documento e os campos mínimos de SEO; nunca `created_by`, datas internas ou o rascunho.

## 4. Etapa 8 — formulários e CRM

Tabelas `forms`, `form_fields`, `form_submissions` e `rate_limit_hits` conforme [MODELO_BANCO_DADOS §4.4 e §4.5](MODELO_BANCO_DADOS.md), com estes pontos fixos:

- **Nenhuma** dessas tabelas é legível ou gravável por `anon`.
- O envio público entra pela Edge Function `submit-form`, que chama a RPC `ingest_submission` com a chave de serviço **dentro da função** (nunca no navegador).
- O servidor confere que o formulário está ativo e pertence a uma página publicada, e decide funil e etapa pelos dados do **banco**, ignorando o que o navegador mandar.
- `submission_key uuid unique` garante idempotência: reenvio não duplica contato nem oportunidade.
- Contato é localizado por e-mail ou telefone normalizados (`find_duplicate_contacts` já existe) antes de criar um novo.
- Origem gravada: página, versão, formulário, URL, UTMs (`source`, `medium`, `campaign`, `content`, `term`) e data.
- IP só como hash diário com sal (não reversível), para o limite de taxa.

**Pré-requisito:** a migração do CRM (`20261110120000_crm.sql`) precisa estar aplicada no banco remoto. Isso ainda não foi confirmado.

## 5. Permissões (resumo)

| Objeto | `anon` | `sales` | `manager` | `admin` |
|---|---|---|---|---|
| `pages`, `page_versions` | — | — | leitura | leitura; escrita só por RPC |
| `get_public_page`, `get_public_site` | executar | executar | executar | executar |
| RPCs de gerenciamento e publicação | — | — | — | executar |
| `forms`, `form_fields` | — | — | leitura | leitura e escrita |
| `form_submissions` | — | só dos seus contatos | leitura | leitura |
| Edge Function `submit-form` | chamar | — | — | — |

## 6. Como validar

- Testes pgTAP por migração (padrão do projeto). **Hoje não rodam**, porque não há Docker nem banco de testes. Antes da Etapa 7 precisamos de um dos dois; sem isso, a RLS só é conferida por leitura do SQL e por teste manual no banco real.
- Cada script entregue para o SQL Editor será idempotente (`create or replace`, `if not exists`) e virá com uma consulta de conferência somente leitura.
