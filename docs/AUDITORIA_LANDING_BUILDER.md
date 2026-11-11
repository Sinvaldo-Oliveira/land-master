# Auditoria — Landing Page Builder (Etapa 0)

> 2026-11-11 · branch `fase-4-home` (commit `5f210ad`) · Nenhum código, dependência ou banco foi alterado nesta etapa.
> PRD: [PRD_LANDING_PAGE_BUILDER](PRD_LANDING_PAGE_BUILDER.md) · Plano: [PLANO_IMPLEMENTACAO_LANDING](PLANO_IMPLEMENTACAO_LANDING.md)

## 1. Resumo

O módulo não parte do zero. O projeto já tem o que o PRD pede como base: páginas em JSON tipado com rascunho e versões publicadas, renderizador público de lista fechada, upload de mídia, autenticação com perfis e RLS, e um editor de seções para a Home. O banco já aceita landing pages (`pages.kind = 'landing'`, com `slug`).

O que **não** existe: lista e criação de landing pages, rota pública por slug, editor em três painéis com canvas, árvore de blocos (o documento atual é uma lista plana de seções), biblioteca de primitivos, templates de landing, formulários e a ligação com o CRM.

Há três pendências de ambiente que afetam o cronograma (§7): os testes unitários não rodam nesta máquina, não consigo instalar pacotes enquanto o `node_modules` estiver travado, e o estado das migrações no banco remoto precisa ser confirmado.

## 2. Estrutura encontrada

| Área | Onde | Situação verificada |
|---|---|---|
| Rotas | `src/app/router.tsx` | Público: `/` e 404. Admin em `/admin/*`, tudo carregado sob demanda. Já existe `/admin/paginas/*` apontando para um aviso de "módulo em construção". Não existe rota pública de landing. |
| Menu | `src/admin/navigation.ts` | Item "Landing pages" (`/admin/paginas`), só para `admin`. Fonte única de navegação e de visibilidade por perfil. |
| Autenticação | `src/admin/auth/` | Supabase Auth (e-mail e senha, PKCE), `ProtectedLayout`, perfis `admin`/`manager`/`sales`. A autorização real é a RLS. |
| Renderizador público | `src/renderer/` | `PageDocument v1`: lista plana de 13 tipos de seção, tema por variáveis CSS (`--site-*`), links por `safeHref`, sem HTML livre. Seções pesadas via `React.lazy`. |
| Editor da Home | `src/modules/home/` | Formulário por seção gerado de descritores (`section-fields.ts`), prévia em iframe por dispositivo, validação Zod completa, rascunho/publicar com detecção de conflito, upload de imagem (→ WebP) e vídeo, fundo e cor de texto por seção, categorias, arrastar e soltar nativo. |
| UI do admin | `src/admin/ui/` | Button, Field, Input, Select, Switch, Dialog, Sheet, DropdownMenu, Tooltip, Badge, Card, StatCard, EmptyState, ErrorState, Skeleton, PageHeader, Toaster (sonner). |
| CRM | `src/modules/contacts`, `src/modules/crm` | Contatos e oportunidades implementados (Fase 3). Faltam arrastar no quadro, configurações e convites. |
| Formulários | `src/modules/forms/` | Só o aviso de "em construção" (Fase 6). |
| Banco | `supabase/migrations/` | 6 migrações (identidade, CRM, páginas, mídia). Sem Edge Functions (`supabase/functions` não existe). |
| Testes | Vitest, Playwright, pgTAP | 71 testes E2E com backend simulado. Testes pgTAP escritos e **nunca executados** (sem Docker). |
| Publicação | `docs/ESTRATEGIA_PUBLICACAO.md` | ADR-001 já decidiu o modelo híbrido: SPA dinâmica agora, camada PHP de SEO depois. `public/.htaccess` com fallback de SPA criado em 2026-11-11. |

### Dependências instaladas (relevantes)

React 19.3, React Router 7.18, TypeScript 6.0, Vite 8.3, Tailwind 4.3, Supabase JS 2.119, TanStack Query 5, React Hook Form 7, Zod 4, Radix UI, lucide-react, sonner, Vitest 5, Testing Library, Playwright 1.65.

**Não instaladas:** dnd-kit e Zustand. Avaliação em [ARQUITETURA_LANDING_BUILDER §6](ARQUITETURA_LANDING_BUILDER.md).

## 3. Banco de dados: o que já serve

| Objeto | Situação | Uso no builder |
|---|---|---|
| `pages` | `kind in ('home','landing')`, `slug` único e validado para `landing`, `status` com `draft`/`published`/`unpublished`/`archived`, `draft_document` (jsonb ≤ 512 kB), `draft_updated_at` para concorrência. | **Reutilizar.** Dispensa `landing_pages`. |
| `page_versions` | Uma linha imutável por publicação. | **Reutilizar.** Dispensa `landing_page_versions`. |
| `save_page_draft`, `publish_page` | Funcionam por `page_id`, só para `admin`. | **Reutilizar** sem mudança. |
| `get_public_site()` | Devolve só a Home publicada. | Falta a leitura pública por slug. |
| `media_assets` + bucket `site-media` | Upload com checagem de tipo real e conversão para WebP. | **Reutilizar.** Dispensa `landing_page_media`. |
| `contacts`, `deals`, `pipelines`, `pipeline_stages`, `lead_sources` | CRM da Fase 3. Contato já tem `utm`, `source_id`, `source_detail`, `consent_at`. | Destino dos leads. Nada de CRM paralelo. |

O que falta no banco (detalhe em [BANCO_LANDING_BUILDER](BANCO_LANDING_BUILDER.md)): criar/duplicar/renomear/arquivar/despublicar/excluir landing, leitura pública por slug, lista de slugs reservados, e as tabelas de formulários e envios (já desenhadas em `MODELO_BANCO_DADOS §4.4`, ainda não criadas).

## 4. Componentes aproveitáveis

| Peça existente | Como entra no builder |
|---|---|
| `PageRenderer` e as 13 seções | Viram os blocos da categoria "Seções completas", sem reescrever. |
| `section-fields.ts` + `FieldsEditor` | Base do painel de propriedades: cada bloco declara seus campos. |
| `PreviewFrame` (iframe com estilos espelhados) | Base do canvas: é o que garante breakpoints reais por largura. |
| `ImageField`, `media.ts` | Campo de imagem/vídeo e upload. Falta a tela de biblioteca (listar, buscar, reutilizar). |
| `ColorField`, `BackgroundField`, `TextColorsField`, `surface.ts` | Aba "Estilo": cor, degradê e contraste já calculados. |
| `document-schema.ts`, `editor-state.ts` | Padrão de validação e de funções puras de edição (mover, remover, duplicar). |
| Fluxo salvar/publicar da Home | Mesmo fluxo, com autosave por cima. |
| `useReveal` | Motor das animações de entrada (CSS + IntersectionObserver). |
| Testes E2E com backend simulado | Mesmo padrão para os fluxos do builder. |

## 5. Lacunas em relação ao PRD

| PRD | Situação | Etapa |
|---|---|---|
| §6 Gerenciamento de páginas | Não existe | 1 |
| §7 Criação (do zero / modelo) | Não existe | 1 e 5 |
| §8 Editor em 5 regiões | Não existe. O editor da Home é de formulário + prévia, sem canvas selecionável. | 2 |
| §9 Blocos primitivos e contêineres | Não existem. O documento atual não tem árvore (`children`). | 2 a 4 |
| §10 Arrastar e soltar estruturado | Só existe o arraste nativo entre pastas na Home. | 3 |
| §12 Ajustes por breakpoint | Não existe (as seções são responsivas, mas sem override por dispositivo). | 4 |
| §13 Templates de landing | Só o template Institucional da Home. | 5 |
| §14 Kit de identidade | Parcial: nome, cores e logo vivem dentro do documento da Home, não numa configuração global. | 4 |
| §15 Biblioteca de mídia | Upload existe; listagem, busca, reutilização e exclusão segura não. | 6 |
| §16 Formulários → CRM | Não existe (nem tabelas, nem Edge Function). | 8 |
| §17 Autosave e histórico | Salvar é manual; histórico de versões publicadas existe no banco, sem tela. | 6 |
| §19 Publicação por slug | Não existe rota nem RPC pública. | 7 |
| §20 SEO por página | Título e descrição existem no documento; faltam canonical, OG, noindex e a camada para robôs. | 9 |
| §21 Animações configuráveis | Há um efeito de entrada único; faltam presets por bloco. | 9 |

## 6. Decisões que dependem de você

| # | Decisão | Recomendação |
|---|---|---|
| D-L1 | Endereço público: `/lp/:slug` (PRD) ou `/:slug` (plano antigo). | **Decidido em 2026-11-11: `/lp/:slug`.** Não colide com rotas futuras, dispensa lista de slugs reservados e isola o chunk da landing. |
| D-L2 | Rota do admin: manter `/admin/paginas` (já existe, em português como as outras) ou trocar para `/admin/landing-pages`. | **Manter `/admin/paginas`.** |
| D-L3 | Formato do documento: árvore de blocos (`PageDocument v2`) só para landings, mantendo a Home em v1. | **Sim**, com as seções atuais reaproveitadas como blocos. |
| D-L4 | Instalar `@dnd-kit` na Etapa 3. | **Sim**, só no bundle do admin. Zustand: não por enquanto. |
| D-L5 | Templates como código do repositório (versionados com o renderizador) em vez de tabela no banco. | **Código**, na v1. |
| D-L6 | Camada PHP de SEO (ADR-001) continua para a etapa final. | **Decidido em 2026-11-11: sim.** |

## 7. Riscos e pendências de ambiente

| Risco | Efeito | O que resolve |
|---|---|---|
| Testes unitários não rodam nesta máquina (Vitest: "failed to find the current suite"). | A lógica nova de documento, histórico e validação ficaria sem teste unitário — inaceitável para este módulo. | Fechar os processos que travam o `node_modules` e reinstalar com `npm ci`. **Pré-requisito da Etapa 1.** |
| `node_modules` travado por processos MCP. | Não consigo instalar o `@dnd-kit`. | Idem. Pré-requisito da Etapa 3. |
| Estado das migrações no banco remoto. | A migração do CRM pode não estar aplicada; sem ela os formulários não têm destino. | Consulta de leitura no SQL Editor antes da Etapa 8. Eu não aplico migração remota: entrego o script para você rodar. |
| Sem Docker: sem Supabase local nem pgTAP. | RLS e RPCs novas só são validadas por leitura e no banco real. | Projeto Supabase de testes, ou Docker, antes da Etapa 7. |
| Arrastar para dentro do canvas em iframe. | Arraste entre documentos é o ponto técnico mais incerto. | Prova de conceito no início da Etapa 3; alternativa garantida: inserir por clique e reordenar pela árvore de camadas. |
| Orçamento do bundle público: 114,1 de 120 kB. | Blocos novos não cabem no bundle inicial. | Rota `/lp/:slug` e blocos de landing em chunks próprios. |
| SEO e prévia em redes sociais com SPA pura. | WhatsApp e Facebook não executam JS: a prévia sai genérica até a camada PHP. | ADR-001, etapa final. Limitação declarada até lá. |
| Segredos no `.env` local (`TOKEN=sbp_…`) e chave secreta exposta em captura antiga. | Acesso amplo ao projeto Supabase. | Revogar e remover. Pendência sua, já sinalizada. |
| `.env.example` e `.env.e2e` apagados no working tree. | O PRD mestre exige `.env.example`. | Restaurar do Git (`git checkout -- .env.example .env.e2e`). |

## 8. Arquivos analisados

`package.json`, `playwright.config.ts`, `vite.config.ts`, `public/.htaccess`, `src/app/router.tsx`, `src/admin/navigation.ts`, `src/admin/auth/*`, `src/admin/ui/*`, `src/lib/env.ts`, `src/lib/supabase.ts`, `src/renderer/*` (tipos, renderizador, tema, superfície, seções), `src/modules/home/*`, `src/modules/landing-builder/LandingPagesPage.tsx`, `src/modules/forms/FormsPage.tsx`, as 6 migrações em `supabase/migrations/`, e os documentos `ARQUITETURA_TECNICA`, `MODELO_BANCO_DADOS`, `DESIGN_SYSTEM`, `ESTRATEGIA_PUBLICACAO`, `PLANO_DESENVOLVIMENTO` e `REFERENCIAS_VISUAIS`.
