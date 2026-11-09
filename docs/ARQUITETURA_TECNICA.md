# Arquitetura Técnica

> Versão 0.1 · 2026-11-09 · Status: **proposta para revisão** — nenhuma implementação foi iniciada.

## 1. Visão geral

```
                     Hostinger (Apache/LiteSpeed, arquivos estáticos)
┌──────────────────────────────────────────────────────────────────────────┐
│ dist/                                                                    │
│  index.html ─► SPA React                                                 │
│   ├─ bundle público  (Home, /:slug, renderizador, formulários)  ~leve    │
│   ├─ chunk admin     (lazy: layout, CRM, contatos, relatórios)           │
│   └─ chunk editor    (lazy: construtor de páginas, dnd-kit, zustand)     │
│  index.php (opcional) ─► injeta SEO/OG + JSON publicado                  │
│  .htaccess ─► HTTPS, fallback SPA, cabeçalhos, cache                     │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ HTTPS (chave publishable/anon + JWT do usuário)
┌───────────────▼──────────────────────────────────────────────────────────┐
│ Supabase (1 projeto por cliente)                                         │
│  Auth (e-mail/senha, convite, sem cadastro público)                      │
│  PostgreSQL + RLS  ◄─ RPCs (move_deal, publish_page, métricas…)          │
│  Storage: site-media (público, só leitura) · private-files (privado)     │
│  Edge Functions: submit-form · invite-user · manage-user · track (P1)    │
└──────────────────────────────────────────────────────────────────────────┘
```

Princípios:
1. **Frontend 100% estático.** Toda regra que exige confiança roda no Postgres (RLS, constraints, RPC `security definer` controladas) ou em Edge Functions.
2. **Autorização no banco.** A UI esconde o que o usuário não pode fazer, mas quem decide é a RLS.
3. **Conteúdo como dados tipados.** Páginas são JSON versionado validado por Zod; renderização por lista fechada de componentes.
4. **Bundle público mínimo.** Visitantes nunca baixam código do admin ou do editor.
5. **Uma instalação = um projeto Supabase + uma pasta `dist/`**, configuradas por variáveis de ambiente e migrações.

## 2. Stack e versões

Versões estáveis consultadas no npm em 2026-11-09. Serão **fixadas exatamente** (`"x.y.z"`, sem `latest`/`^`) na Fase 2, após verificar compatibilidade cruzada; o `package-lock.json` será versionado.

| Camada | Pacote | Versão consultada | Observação |
|---|---|---|---|
| UI | `react`, `react-dom` | 19.3.1 | |
| Build | `vite` | 8.3.x | |
| Build | `@vitejs/plugin-react` | 6.x | Em `devDependencies` |
| Linguagem | `typescript` | **6.0.x** | 7.0.2 (port nativo) já publicado; adotar só quando `typescript-eslint` suportar oficialmente |
| Estilo | `tailwindcss`, `@tailwindcss/vite` | 4.3.x | Tokens via `@theme`; tema público no padrão shadcn |
| Estilo | `class-variance-authority`, `tailwind-merge`, `clsx` | 0.7.1 / 3.7 / 2.1 | Variantes de componentes no padrão shadcn/ui (base do ecossistema do 21st.dev) |
| Ferramenta | `shadcn` (CLI, dev) | 4.23.x | Só para gerar/adaptar componentes no repositório; não é dependência de runtime |
| Animação | `motion` | 14.11.x | **Somente** por import dinâmico em blocos que exigem física/layout; o resto é CSS — ver [REFERENCIAS_VISUAIS §4](REFERENCIAS_VISUAIS.md#4-animações-e-transições) |
| Rotas | `react-router` | **7.18.5** (modo data, sem SSR) | A 8.x exige Node ≥ 22.22; a máquina de desenvolvimento tem 22.20. Reavaliar ao atualizar o Node |
| Lint | `eslint` + `@eslint/js` | 10.14.0 / 10.0.1 | `eslint-plugin-jsx-a11y` 6.10.2 declara suporte só até o ESLint 9; validado no ESLint 10 (detecta as violações) e liberado via `overrides` no `package.json`. A 9.x já está sem suporte |
| Testes DOM | `jsdom` | 27.4.0 | A 31.x exige Node ≥ 22.22 |
| Backend | `@supabase/supabase-js` | 2.119.x | |
| Dados remotos | `@tanstack/react-query` | 5.107.x | Cache, invalidação, otimismo do Kanban |
| Formulários | `react-hook-form` + `zod` + `@hookform/resolvers` | 7.91 / 4.6 / 7.0 | Zod também nas Edge Functions (via `npm:` no Deno) |
| Drag-and-drop | `@dnd-kit/core` + `@dnd-kit/sortable` | 6.3.1 / 10.0.0 | API estável; `@dnd-kit/react` (0.5) ainda pré-1.0 — descartado por ora |
| Componentes acessíveis | `radix-ui` (primitivos) | 1.8.x | Componentes próprios no estilo shadcn/ui (código no repositório, sem lib visual pesada) |
| Estado do editor | `zustand` | 5.1.x | Só no chunk do editor; histórico desfazer/refazer próprio |
| Ícones | `lucide-react` | 1.70.x | Import por ícone (tree-shaking) |
| Gráficos | `recharts` | 3.10.x | Só no chunk admin |
| Toasts | `sonner` | (verificar) | ~3 kB; alternativa: toast próprio com Radix |
| Testes | `vitest`, `@testing-library/react`, `@playwright/test` | 5.1 / 16.x / 1.65 | |
| Banco/CLI | `supabase` (CLI, dev) | 3.1.x | Migrações, tipos, testes pgTAP, deploy de funções |

**Descartados por ora:** Redux, MUI/Chakra/Ant (peso e estética genérica), Moment/Day.js (usar `Intl`), editores WYSIWYG HTML (Tiptap/Quill — conflitam com “sem HTML arbitrário”; texto rico será JSON restrito), GrapesJS/Craft.js (acoplam modelo de dados e geram HTML), GSAP (licença e peso; CSS + `motion` cobrem o necessário), Spline/Three.js/Lottie no bundle público (P2, sob demanda).

**Referências visuais:** [21st.dev](https://21st.dev/) e [motionsites.ai](https://motionsites.ai/) — detalhadas em [REFERENCIAS_VISUAIS](REFERENCIAS_VISUAIS.md). O projeto Fortt **não** é referência técnica nem visual.

## 3. Estrutura de pastas

```text
land-master/
  docs/                         ← este planejamento + guias de instalação
  public/
    .htaccess
    index.php                   ← camada SEO opcional (Fase 8)
    robots.txt
  src/
    app/
      main.tsx                  ← bootstrap, QueryClient, Router
      router.tsx                ← árvore de rotas (público + admin lazy)
      providers/                ← AuthProvider, ThemeProvider (público)
    renderer/                   ← COMPARTILHADO público/editor: PageDocument → React
      blocks/                   ← um componente por tipo de bloco (lista fechada)
        <tipo>/variants.ts      ← variações desenhadas (presets de props + style)
      motion/                   ← observer de entrada, utilitários CSS, loaders dinâmicos de `motion`
      schema/                   ← Zod do PageDocument + migrações de schemaVersion
      theme/                    ← tema público (tokens shadcn em .site-root, a partir de business_settings)
    public-site/                ← rotas públicas: Home, /:slug, obrigado, privacidade, 404
    admin/
      layouts/                  ← AdminLayout (sidebar, topbar), AuthGuard, RoleGuard
      ui/                       ← design system do admin (Button, Input, Dialog, Sheet, Table…)
    modules/
      dashboard/
      contacts/
      crm/
      home/                     ← editor da Home (usa o renderer + painel de seções)
      landing-builder/          ← editor visual (lazy)
      forms/
      reports/
      settings/
      users/
    services/                   ← acesso Supabase por domínio (contacts.service.ts…)
    hooks/
    lib/                        ← supabase client, formatadores Intl, utilitários
    types/
      database.ts               ← gerado: `supabase gen types typescript`
  supabase/
    config.toml
    migrations/                 ← SQL versionado (timestamp_nome.sql)
    seed.sql                    ← só dados de configuração (funil padrão, templates) — sem dados pessoais
    tests/                      ← pgTAP: RLS por perfil, RPCs
    functions/
      _shared/                  ← cors, validação, rate limit, cliente admin
      submit-form/
      invite-user/
      manage-user/
      track/                    ← P1
  tests/e2e/                    ← Playwright
  .env.example
```

Cada módulo em `modules/<nome>/` segue: `routes.tsx`, `pages/`, `components/`, `api.ts` (hooks TanStack Query), `schemas.ts` (Zod), `types.ts`.

## 4. Roteamento e divisão de bundles

```tsx
// esquema (não é código final)
createBrowserRouter([
  { element: <PublicShell/>, children: [
      { index: true, element: <HomeRoute/> },
      { path: 'privacidade', element: <PrivacyRoute/> },
      { path: ':slug', element: <LandingRoute/> },
      { path: ':slug/obrigado', element: <ThankYouRoute/> },
      { path: '*', element: <NotFound/> },
  ]},
  { path: 'admin/login', lazy: () => import('./admin/login') },
  { path: 'admin', lazy: () => import('./admin/layouts/AdminLayout'), children: [
      { index: true, lazy: () => import('./modules/dashboard') },
      { path: 'contatos/*', lazy: () => import('./modules/contacts') },
      { path: 'crm/*', lazy: () => import('./modules/crm') },
      { path: 'site', lazy: () => import('./modules/home') },
      { path: 'paginas', lazy: () => import('./modules/landing-builder/list') },
      { path: 'paginas/:id/editar', lazy: () => import('./modules/landing-builder/editor') },
      { path: 'formularios/*', lazy: () => import('./modules/forms') },
      { path: 'relatorios', lazy: () => import('./modules/reports') },
      { path: 'configuracoes/*', lazy: () => import('./modules/settings') },
  ]},
])
```

Orçamento de bundle (verificado no CI com `vite build` + checagem de tamanho):

| Chunk | Limite gzip |
|---|---|
| Público inicial (React, router, supabase-js, renderer, tema) | ≤ 120 kB |
| Admin base (layout, design system, Query) | ≤ 150 kB |
| Editor | ≤ 200 kB |

`supabase-js` entra no bundle público por ser necessário para ler páginas e enviar formulários; se pesar demais, o público usa `fetch` direto na REST/Functions (sem o SDK) — decisão medida na Fase 5.

## 5. Dados e estado

| Tipo de estado | Ferramenta |
|---|---|
| Dados do servidor | TanStack Query (chaves por domínio: `['deals', filtros]`) |
| Formulários | React Hook Form + Zod (mesmos schemas reutilizados nas Edge Functions quando aplicável) |
| Documento em edição (editor) | Zustand: `document`, `selection`, `history.past/future`, `viewport` |
| Preferências locais (filtros, painel recolhido) | `localStorage` com try/catch |
| Sessão | `supabase.auth` + contexto React |

**Kanban — atualização otimista:**
1. `onMutate`: cancela queries, guarda snapshot, move o card localmente.
2. `mutationFn`: `rpc('move_deal', { deal_id, to_stage_id, to_position })` — transação no banco que atualiza `deals` e grava `deal_events`.
3. `onError`: restaura snapshot + toast “Não foi possível mover. Tente novamente.”
4. `onSettled`: invalida a query da coluna afetada.

Ordenação dentro da coluna por `position numeric` com indexação fracionária (média entre vizinhos; rebalanceamento por RPC quando a precisão se esgota).

## 6. Autenticação e autorização

| Aspecto | Decisão |
|---|---|
| Login | Supabase Auth, e-mail + senha; recuperação de senha por e-mail. |
| Cadastro público | **Desativado** no projeto (`Enable signups = off`). |
| Novos usuários | Admin convida via Edge Function `invite-user` (usa a chave secreta no servidor) → e-mail de convite → usuário define senha. |
| Primeiro admin | Script SQL documentado na instalação (`select bootstrap_first_admin('email')`), executável uma única vez (falha se já existir admin). |
| Perfis | Enum `app_role`: `admin`, `manager`, `sales` (Administrador, Gestor, Operador comercial). Tabela `user_roles`. |
| Checagem | Funções `security definer` com `search_path=''`: `current_role()`, `has_role(app_role)`, `is_staff()`. Usadas nas políticas como `(select public.has_role('admin'))` para cachear por consulta. |
| Desativar usuário | `profiles.is_active=false` + ban no Auth via `manage-user`; `is_staff()` exige `is_active`. |
| Guardas no front | `AuthGuard` (sessão) e `RoleGuard` (UX); sem efeito de segurança. |
| Sessão | Tokens em `localStorage` (padrão supabase-js) — mitigado por CSP estrita e ausência de HTML arbitrário. |

Matriz de permissões em [MODELO_BANCO_DADOS §5](MODELO_BANCO_DADOS.md#5-matriz-de-permissões-rls).

## 7. Edge Functions

| Função | Acesso | Responsabilidade |
|---|---|---|
| `submit-form` | Pública (sem JWT) | Validação Zod do payload contra a definição do formulário; honeypot; tempo mínimo; Turnstile (se configurado); rate limit por `ip_hash` + formulário; idempotência por `submission_key`; chama RPC `ingest_submission` (transacional: contato → submissão → oportunidade → evento). Responde mensagens genéricas. |
| `invite-user` | JWT + `admin` | Convida e atribui perfil. |
| `manage-user` | JWT + `admin` | Alterar perfil, desativar/reativar. Impede remover o último admin. |
| `track` (P1) | Pública | Recebe `page_view`/`form_start` via `sendBeacon`; sem cookies; IP vira hash diário. |

Código compartilhado em `_shared/` (CORS restrito a `ALLOWED_ORIGINS`, resposta de erro padrão, cliente admin, rate limiter baseado em tabela).

**Rate limit** (sem Redis): tabela `rate_limit_hits(bucket, window_start, count)` com `insert … on conflict do update` atômico; ex.: 5 envios/10 min por IP+formulário e 50/h por formulário. Limpeza por `pg_cron` diário (se habilitado) ou dentro da própria função.

## 8. Tema público × design do admin

- **Admin:** design system fixo, neutro, independente do cliente (ver [DESIGN_SYSTEM](DESIGN_SYSTEM.md)). Tokens em `@theme` do Tailwind com prefixo `admin`.
- **Site público:** `ThemeProvider` lê `business_settings.theme` publicado e define tokens no padrão shadcn (`--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--border`, `--radius`, `--font-heading`, `--font-body`…) no contêiner `.site-root`; seções podem inverter para escuro com `data-theme="dark"`. Blocos usam apenas esses tokens. A pré-visualização no editor aplica o tema do rascunho a um `.site-root` isolado, sem afetar a UI do admin.
- **Fontes:** lista curada (8–12 famílias) servida do próprio domínio (pacotes `@fontsource`, `woff2`, `font-display: swap`) — evita envio de IP do visitante ao Google (LGPD) e permite CSP sem domínios externos. Só a família escolhida é carregada.

## 9. Segurança

| # | Controle | Implementação |
|---|---|---|
| 1 | Autenticação | Supabase Auth; senha ≥ 10 caracteres; proteção contra senhas vazadas (se disponível no plano). |
| 2 | Rotas admin protegidas | Guarda no front + RLS no banco. |
| 3 | RLS | Ativada em **todas** as tabelas de `public`; teste automático falha se alguma tabela não tiver RLS. |
| 4 | Autorização por perfil | Políticas por `has_role`/propriedade; RPCs verificam perfil no início. |
| 5 | Validação | Zod no cliente; constraints/CHECK no banco; Zod na Edge Function; validação de documento no `publish_page`. |
| 6 | XSS | Sem `dangerouslySetInnerHTML`, sem `eval`/`new Function`; URLs de links/mídias por lista de protocolos; CSP. |
| 7 | Uploads | Bucket `site-media`: escrita só staff, MIME permitido `image/jpeg`, `image/png`, `image/webp`, `image/avif` (SVG **bloqueado** — pode conter script), limite 5 MB; nome gerado (UUID). Bucket `private-files` sem leitura pública. |
| 8 | Storage | Políticas `storage.objects` por bucket e perfil. |
| 9 | Segredos | Chave secreta/`service_role`, sal de IP, segredo Turnstile só como *secrets* das funções. `VITE_*` contém apenas URL e chave publicável. |
| 10 | Erros | Mensagens genéricas ao usuário; detalhes no log da função sem PII (e-mail/telefone mascarados). |
| 11 | Auditoria | `audit_logs` por gatilho em tabelas sensíveis (usuários/perfis, publicações, exclusões, configurações). |
| 12 | Abuso de formulários | Honeypot, tempo mínimo, rate limit, idempotência, Turnstile opcional. |

**Cabeçalhos (`.htaccess`):**
```
Content-Security-Policy: default-src 'self'; script-src 'self' [https://challenges.cloudflare.com];
  connect-src 'self' https://<ref>.supabase.co; img-src 'self' data: https://<ref>.supabase.co;
  style-src 'self' 'unsafe-inline'; font-src 'self';
  frame-src https://www.youtube-nocookie.com https://player.vimeo.com [https://challenges.cloudflare.com];
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
`style-src 'unsafe-inline'` é necessário para estilos inline gerados pelas propriedades dos blocos (atributo `style`); não há injeção de `<style>` controlada pelo usuário. O CSP é gerado por script no build a partir de `VITE_SUPABASE_URL`.

## 10. Variáveis de ambiente

`.env.example` (frontend — **públicas por natureza**, entram no bundle):
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<chave publishable/anon>
VITE_SITE_URL=https://www.exemplo.com.br
VITE_TURNSTILE_SITE_KEY=            # opcional
```
Secrets das Edge Functions (via `supabase secrets set`, nunca no repositório):
```
IP_HASH_SALT=<aleatório 32+ bytes>
ALLOWED_ORIGINS=https://www.exemplo.com.br,https://exemplo.com.br
TURNSTILE_SECRET_KEY=               # opcional
# SUPABASE_URL e a chave secreta/service_role são injetadas automaticamente pelo Supabase
```
`.gitignore` cobre `.env*` exceto `.env.example`.

## 11. Qualidade e testes

| Camada | Ferramenta | O que cobre |
|---|---|---|
| Tipos | `tsc --noEmit` | Todo o `src/` + tipos gerados do banco |
| Lint | ESLint (flat) + `jsx-a11y` | Padrões e acessibilidade |
| Unidade | Vitest | Schemas Zod, migrações de documento, histórico do editor, cálculos, reducers |
| Componentes | Testing Library | Blocos do renderer, formulários, Kanban (teclado) |
| Banco | pgTAP (`supabase test db`) | RLS por perfil e anônimo; RPCs; constraints |
| Funções | `deno test` | `submit-form`: válido, inválido, honeypot, rate limit, idempotência |
| E2E | Playwright | Fluxos dos critérios de aceite, em `vite preview` com Supabase local |
| Bundle | script de tamanho | Orçamentos do §4 |

Comando agregado: `npm run verify` = lint + typecheck + test + build + checagem de bundle. Nenhuma fase é declarada concluída sem `verify` verde e checagem manual dos fluxos.

## 12. Registro de decisões (ADR)

| ID | Decisão | Status |
|---|---|---|
| ADR-001 | Publicação híbrida: SPA dinâmica + camada PHP opcional de SEO | Proposta — [ESTRATEGIA_PUBLICACAO](ESTRATEGIA_PUBLICACAO.md) |
| ADR-002 | Produto novo em `land-master`; o Fortt **deixa de ser referência**; referências visuais = 21st.dev e motionsites.ai | **Revisada** pelo responsável (2026-11-09) |
| ADR-003 | Single-tenant sem `tenant_id`; perfis por `user_roles` + RLS | Proposta |
| ADR-004 | Páginas como JSON tipado versionado; renderer de lista fechada | Proposta |
| ADR-005 | Componentes próprios sobre Radix (sem lib visual) | Proposta |
| ADR-006 | Formulários públicos só via Edge Function `submit-form` | Proposta |
| ADR-007 | Fontes self-hosted (LGPD/CSP) | Proposta |
| ADR-008 | TypeScript 6.x até ecossistema suportar 7.x | Proposta |
| ADR-009 | Tema público com tokens no padrão shadcn (escopo `.site-root`) e biblioteca de seções com variações desenhadas | Proposta — [REFERENCIAS_VISUAIS §3](REFERENCIAS_VISUAIS.md#3-o-que-adotamos) |
| ADR-010 | Animações CSS-first + IntersectionObserver; `motion` só por import dinâmico por bloco | Proposta — [REFERENCIAS_VISUAIS §4](REFERENCIAS_VISUAIS.md#4-animações-e-transições) |
