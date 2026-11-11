# Plano de Implementação — Landing Page Builder

> 2026-11-11 · Status: **Etapa 1 implementada em 2026-11-11** (autorizada pelo responsável); falta você rodar o script do banco. **Etapa 2 implementada em 2026-11-11.** Etapa 3 aguarda autorização. Detalha a Fase 5 (e parte das Fases 6 e 8) do [PLANO_DESENVOLVIMENTO](PLANO_DESENVOLVIMENTO.md).
> Regra: uma etapa por vez, cada uma com autorização explícita. Nenhuma etapa é dada como pronta sem os testes indicados.

## Antes de começar (pendências de ambiente)

| # | Pendência | Bloqueia | Quem resolve |
|---|---|---|---|
| P1 | ~~Testes unitários não rodam (Vitest).~~ **Resolvida em 2026-11-11.** A causa não era o `node_modules`: o terminal abria a pasta como `c:…` (letra da unidade minúscula) e o Vitest carregava módulos duplicados. Rodando a partir de `C:…` tudo passa. O `node_modules` só fica travado enquanto o `npm run dev` está aberto, o que importa apenas na hora de instalar pacotes (Etapa 3). | — | — |
| P2 | ~~Decisões D-L1 a D-L6 da [auditoria §6](AUDITORIA_LANDING_BUILDER.md).~~ **Resolvida em 2026-11-11:** as seis decididas. | — | — |
| P3 | Restaurar `.env.example` e `.env.e2e`; revogar o token `sbp_` do `.env` e a chave secreta exposta. | — (higiene) | Você. |
| P4 | Confirmar quais migrações estão aplicadas no banco remoto (CRM em especial). | Etapa 8 | Você roda uma consulta de leitura que eu preparo. |
| P5 | Banco de testes (Docker ou segundo projeto Supabase) para validar RLS com pgTAP. | Etapa 7 | Decisão sua. |

## Etapas

Cada etapa termina com: typecheck, lint, testes unitários, E2E, build, orçamento do bundle e um commit próprio.

### Etapa 1 — Fundação do módulo ✅ (2026-11-11)

> Entregue: documento v2 (`src/renderer/document-v2.ts`, validação em `src/modules/landing-builder/schema/`), migração `20261111160000_landing_pages_management.sql`, telas `/admin/paginas` e `/admin/paginas/nova`. Verificado: lint, typecheck, 269 testes unitários, 101 testes E2E, build e orçamento do bundle. **Pendente de você:** rodar `supabase/RODAR_NO_SQL_EDITOR_landing_etapa1.sql` (critério 8). Os testes pgTAP foram escritos e não executados (sem banco de testes, P5). `audit_logs` ficou para a etapa de produção.

- Documento v2: tipos, esquema Zod, `migrateDocument`, limites (blocos e profundidade).
- Migração `landing_pages_management` (script para você rodar) e serviços do painel.
- Tela **Minhas landing pages**: indicadores reais, busca, filtro, ordenação, cartões/lista, ações (duplicar, arquivar, excluir, renomear, trocar slug).
- Tela **Nova landing page**: começar do zero (os modelos entram na Etapa 5).
- **Pronto quando:** crio, renomeio, duplico, arquivo e excluo uma página; slug repetido é recusado com mensagem clara; a Home e o CRM seguem intactos (regressão E2E).

### Etapa 2 — Editor visual básico ✅ (2026-11-11)

> Entregue: rota `/admin/paginas/:id` com biblioteca de blocos, camadas, canvas em iframe e painel de propriedades; blocos Seção, Título, Parágrafo, Imagem, Botão, Espaçador e Divisor, mais as 13 seções prontas; inserir por clique (no fim, depois do selecionado, acima ou abaixo); mover, duplicar e excluir pelo painel; salvar manual (botão e Ctrl+S) com detecção de conflito; Computador, Tablet e Celular.
> Verificado: lint, typecheck, 341 testes unitários, 113 testes E2E, build e orçamento do bundle. O critério "5 blocos, editar, salvar, recarregar e continuar" está coberto por teste E2E com backend simulado; **falta o teste no banco real**, que depende do script da Etapa 1.
> Diferenças em relação ao plano: mover, duplicar e excluir já entraram aqui (sem eles o editor não é usável); a marcação de seleção no canvas é só o contorno, e as ações ficam no painel de propriedades (a barra flutuante sobre o bloco fica para a Etapa 3, junto com o arraste). Ainda **não há desfazer**: por isso excluir pede confirmação.
> Correção de carona: o `PreviewFrame` devolvia o resultado de `scrollTo` dentro de um efeito; em navegadores novos isso é uma Promise e derrubava a tela ao trocar de seleção (afetava também o editor da Home).

- Layout em 5 regiões; canvas em iframe com o renderizador em modo de edição.
- Seleção de bloco no canvas e na árvore de camadas; painel de propriedades (aba Conteúdo).
- Blocos: as seções completas existentes + Seção, Título, Parágrafo, Imagem, Botão, Espaçador e Divisor.
- Inserir por clique (antes/depois), salvar manual, alternar Desktop/Tablet/Mobile.
- **Pronto quando:** monto uma página com 5 blocos, edito textos, salvo, recarrego e continuo de onde parei.

### Etapa 3 — Arrastar e soltar e histórico

- Prova de conceito do arraste para dentro do iframe; depois, `@dnd-kit` na biblioteca, no canvas e nas camadas.
- Duplicar, excluir, mover por teclado; `canInsert` bloqueando estruturas inválidas.
- Desfazer e refazer.
- **Pronto quando:** toda movimentação altera o documento (testado sem interface) e pode ser desfeita; estrutura inválida é impossível de criar.

### Etapa 4 — Estilo e responsividade

- Aba Estilo (tipografia, cores, fundo, espaçamentos, borda, raio, sombra) por tokens.
- Aba Responsivo: override por dispositivo e ocultar por dispositivo.
- Colunas, Grade, Lista, Selo, Ícone, Vídeo, Botão WhatsApp, Lista de benefícios.
- Kit de identidade: configuração global da marca aplicada a páginas novas.
- **Pronto quando:** um ajuste no celular não muda o desktop; nenhuma classe sai do banco (teste de build).

### Etapa 5 — Templates

- Seções Depoimentos, Preços, Produtos, Galeria e Cartão de oferta.
- Os 7 templates e a galeria de modelos, com prévia.
- **Pronto quando:** usar um modelo cria uma cópia editável e o modelo original não muda.

### Etapa 6 — Salvamento e mídia

- Autosave com os quatro estados e tratamento de conflito.
- Histórico de versões publicadas: consultar e restaurar (gera nova revisão).
- Biblioteca de mídia: listar, buscar, reutilizar, excluir com checagem de uso.

### Etapa 7 — Pré-visualização e publicação

- `get_public_page`, rota `/lp/:slug`, publicar com validações, despublicar.
- **Pronto quando:** E2E cria por modelo, edita, publica e abre deslogado pela URL; rascunho nunca é lido sem login.

### Etapa 8 — Formulários e CRM

- Tabelas de formulário, Edge Function `submit-form`, bloco Formulário, proteção antispam.
- **Pronto quando:** envio público cria contato e oportunidade na etapa configurada; reenvio não duplica; nenhum dado de lead é legível por `anon`.

### Etapa 9 — SEO, animações e performance

- Campos de SEO, presets de animação, medição (LCP, INP, CLS, peso do JS) e acessibilidade.

### Etapa 10 — Homologação Hostinger

- Camada PHP de SEO, `sitemap.xml`, cabeçalhos de segurança, teste de rotas diretas, checklist de produção. **Nada vai para produção sem a sua autorização.**

## Critérios de aceite da primeira implementação (Etapa 1)

1. `/admin/paginas` mostra a lista real do banco, com estado vazio quando não há páginas.
2. Criar página do zero pede nome e slug, valida o formato e recusa slug repetido.
3. Duplicar, renomear, trocar slug, arquivar, restaurar e excluir funcionam e pedem confirmação quando destrutivos.
4. Só `admin` acessa; `manager` e `sales` não veem o módulo, e as RPCs recusam mesmo por chamada direta.
5. O documento v2 é validado no painel e no banco; documento inválido não é salvo.
6. Testes unitários do documento (validação, migração, limites) e E2E dos fluxos acima passam.
7. Home, editor do site, contatos e CRM passam na regressão; bundle público continua dentro de 120 kB.
8. O script da migração foi entregue, revisado por você e aplicado por você.

## O que fica fora da v1

Posicionamento livre, HTML ou scripts personalizados, testes A/B, domínio por página, multi-idioma, e-commerce, e redirecionamento 301 de slugs antigos.
