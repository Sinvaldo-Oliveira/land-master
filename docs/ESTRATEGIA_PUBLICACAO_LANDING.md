# Estratégia de Publicação — Landing Pages

> 2026-11-11 · Status: **proposta**. A decisão de fundo já está em [ESTRATEGIA_PUBLICACAO](ESTRATEGIA_PUBLICACAO.md) (ADR-001, modelo híbrido). Este documento aplica aquela decisão às landing pages e responde ao PRD §19, sem repetir a comparação completa.

## 1. Decisão

**Estratégia C (híbrida), em dois passos:**

1. **Etapa 7 — renderização a partir do JSON publicado (estratégia A).** A rota `/lp/:slug` busca a versão publicada no Supabase e a desenha com o renderizador do site. Publicar é imediato e não exige novo deploy.
2. **Etapa 10 — camada de SEO em PHP.** Um `index.php` pequeno, servido pela própria Hostinger, injeta título, descrição, Open Graph e o JSON da página no HTML antes de enviá-lo. Se o PHP falhar ou não existir, o site continua funcionando como no passo 1.

A geração estática com deploy automatizado (estratégia B) fica registrada como evolução, não como plano: exigiria repositório, CI e credenciais de FTP por cliente.

## 2. O que isso **não** é

- JSON no Supabase **não** é HTML estático. Até a Etapa 10, o HTML inicial de uma landing é o mesmo `index.html` genérico; o conteúdo aparece depois que o JavaScript roda.
- Consequência prática até a Etapa 10: o Google indexa (ele executa JavaScript), mas a prévia de link no **WhatsApp, Facebook e LinkedIn** mostra título e imagem genéricos. Para pequenos negócios isso pesa, então a camada PHP não é opcional no produto final, só na ordem de entrega.
- O navegador nunca grava em `public_html`. Nenhuma credencial de hospedagem, chave de deploy ou token administrativo vai para o frontend.

## 3. Fluxo de publicação

```text
Editor ──Publicar──▶ validação completa no painel (Zod)
                     └▶ RPC publish_page(page_id)          [admin]
                        ├ valida a estrutura no banco
                        ├ grava nova linha imutável em page_versions
                        └ aponta pages.published_version_id, status = 'published'

Visitante ──/lp/slug──▶ RPC get_public_page(slug)          [anon]
                        └ devolve só o documento publicado, ou nada (404)
```

- **Confirmação:** o botão Publicar abre um diálogo com o endereço final e a lista de pendências. Erros bloqueiam (campo obrigatório vazio, link inválido, formulário sem destino); avisos não bloqueiam (sem `h1`, imagem sem descrição, contraste baixo).
- **Falha:** `publish_page` é uma transação. Se falhar, a versão anterior continua no ar e o painel mostra o erro; não existe estado "meio publicado".
- **Alterações pendentes:** editar uma página publicada mexe só no rascunho. O painel mostra "Publicada, com alterações não publicadas".
- **Despublicar:** `status = 'unpublished'`; a rota passa a responder 404. A versão publicada continua guardada.
- **Arquivar:** sai do ar e da lista padrão, mas continua identificável nos relatórios.
- **Slug:** único no banco. Trocar o slug de uma página publicada exige confirmação, porque o endereço antigo deixa de existir. Redirecionamento 301 do endereço antigo fica como melhoria (precisa da camada PHP).

## 4. Rota pública e hospedagem

| Item | Definição |
|---|---|
| Endereço | `/lp/:slug` (aguardando a decisão D-L1) |
| Recarregar a página / abrir direto | Resolvido pelo `public/.htaccess` (fallback de SPA), criado em 2026-11-11 |
| Código | chunk próprio, fora do bundle inicial da Home |
| Página inexistente ou fora do ar | página 404 do site; status HTTP 404 real só com a camada PHP |
| Supabase fora do ar | mensagem simples com o contato da empresa, em vez de tela em branco |
| Cache | `index.html` sem cache; `/assets/*` com cache longo (nomes com hash) |

## 5. Pré-visualização

Só dentro do admin (`/admin/paginas/:id/previa`), com sessão de administrador. Usa o mesmo renderizador do site, com o rascunho. Formulários não enviam e links externos abrem com aviso. Não existe URL pública de rascunho.

## 6. SEO por página

Campos no documento: título, descrição, URL canônica, imagem de compartilhamento, `noindex` e idioma. Sem a camada PHP eles são aplicados pelo JavaScript (suficiente para o Google); com ela, vão no HTML inicial. `sitemap.xml` com as landings publicadas e indexáveis entra junto com a camada PHP.

## 7. O que precisa ser confirmado antes da Etapa 10

- Versão do PHP no plano da Hostinger contratado.
- Comportamento do cache em arquivo no plano compartilhado.
- Domínio final, para a URL canônica e para as URLs de retorno do Supabase Auth.
