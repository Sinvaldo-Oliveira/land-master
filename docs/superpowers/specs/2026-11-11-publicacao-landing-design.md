# Publicação de landing pages — design

## Intenção

Uma landing criada no painel deve poder ser publicada pelo editor e aberta por visitantes em `/lp/:slug`. O rascunho continua privado; somente uma cópia imutável publicada pode ser lida publicamente.

## Objetivos

- Exibir no editor a ação **Publicar landing** e, quando aplicável, **Ver landing publicada**.
- Publicar por meio da RPC existente `publish_page`, que cria uma versão em `page_versions`.
- Expor apenas a versão apontada por `published_version_id` em uma RPC pública de leitura.
- Renderizar a página pública em rota lazy `/lp/:slug` e responder 404 para slug ausente, rascunho, arquivada ou fora do ar.
- Manter o cartão da lista coerente: URL clicável somente quando a página está publicada.

## Não objetivos

- Não publicar rascunhos automaticamente.
- Não alterar o fluxo de SEO servidor/PHP, formulários ou biblioteca de mídia.
- Não restaurar os arquivos de ambiente excluídos no working tree.

## Abordagens consideradas

1. Ler `pages.draft_document` diretamente no navegador público. Rejeitada: vazaria rascunhos e contornaria o versionamento.
2. Reutilizar `get_public_site` acrescentando uma busca por slug. Rejeitada: mistura Home e landings e força payload desnecessário.
3. Criar `get_public_landing(p_slug)` com `security definer`, que une `pages` à versão publicada. **Escolhida:** preserva RLS, retorna só o necessário e segue o padrão de `get_public_site`.

## Arquitetura

`LandingEditorPage` valida e salva o documento atual antes de chamar `publish_page`. A nova RPC pública lê `{ title, slug, document }` apenas para `kind = 'landing'`, `status = 'published'` e `published_version_id` preenchido. `LandingPage` busca essa RPC via `fetch` direto e renderiza `LandingRenderer`; conteúdo ausente ou inválido usa a página 404 existente.

## Critérios de aceitação

- Ao publicar um rascunho válido, o status do editor vira “Publicada”, a lista é atualizada e o link público é habilitado.
- Ao editar depois de publicar, a landing pública continua mostrando a última versão publicada até uma nova publicação.
- Um endereço de rascunho não abre publicamente.
- A URL pública não retorna documentos de rascunho.
