# Auditoria do Projeto Existente — Fase 0

> Data: 2026-11-09 · Natureza: **somente leitura** (nenhum arquivo de código foi alterado)
> Escopo: `C:\Sinvaldo\webdesigner\land-master` (repositório alvo) e `C:\Sinvaldo\webdesigner\sites\forttimobiliaria` (projeto de referência, escolhido pelo responsável em 2026-11-09)

---

> ⚠️ **Revisão de 2026-11-09 — o Fortt foi descartado como referência.** O responsável decidiu desconsiderar o projeto Fortt (tecnologias, código e visual). As referências passam a ser 21st.dev e motionsites.ai ([REFERENCIAS_VISUAIS](REFERENCIAS_VISUAIS.md)). Este documento fica como **registro histórico** da Fase 0. A conclusão que continua válida: `land-master` não tem landing page nem código, portanto **não há nada a preservar e nenhum risco de regressão**. O sistema, incluindo a Home, será construído do zero com a stack obrigatória do briefing. As seções 3 a 13 abaixo **não orientam mais** o desenvolvimento.

## 1. Resumo executivo

1. **O repositório alvo (`land-master`) não contém aplicação.** Há apenas `.agents/skills/`, `.claude/skills/` (skills do agente) e `skills-lock.json`. Sem `package.json`, `src/`, landing page ou Git. **Não há risco de regressão em `land-master`** — o sistema será construído ali a partir da base técnica auditada abaixo.
2. **A “landing page existente” é o projeto Fortt** (`sites/forttimobiliaria`), um site de imobiliária em React 19 + TypeScript + Vite 8 + Tailwind 4 + React Router 7, com **Appwrite** como backend (não Supabase). Está em estágio de fundação: Home completa, demais páginas em placeholder, login admin e esqueleto de dashboard com dados ilustrativos.
3. Typecheck, lint, teste e build do Fortt **passam** (verificado em 2026-11-09). O build gera um **único chunk JS de 454 kB (126 kB gzip)** contendo site público + admin + SDK Appwrite.
4. **Decisão recomendada:** usar o Fortt como **referência** (stack, estrutura de pastas, padrões de UI, Home por seções, `.htaccess`, roteiro Hostinger), **não como código a ser migrado in loco**. O Fortt permanece intacto; o produto genérico nasce em `land-master` com Supabase.

## 2. Estrutura encontrada

### 2.1 `land-master` (alvo)
```
land-master/
  .agents/skills/   ← 20 skills (superpowers, supabase, frontend-design, copywriting…)
  .claude/skills/   ← mesmas skills para o Claude Code
  skills-lock.json  ← origem/hash das skills
```
Não é repositório Git → **primeira ação da Fase 2: `git init` + commit inicial** (ponto de recuperação).

### 2.2 `sites/forttimobiliaria` (referência)
```
forttimobiliaria/
  index.html                 lang pt-BR, Google Fonts (Cinzel, Montserrat), sem OG/canonical
  vite.config.ts             react() + tailwindcss()
  vitest.config.ts           jsdom
  eslint.config.js           flat config, TS + react-hooks + react-refresh
  tsconfig*.json             strict, noUnused*, Bundler
  public/.htaccess           fallback SPA + 3 cabeçalhos de segurança
  public/assets/             hero 2,16 MB PNG, monograma 554 KB, logo 103 KB
  src/
    main.tsx                 BrowserRouter + AdminAuthProvider
    App.tsx                  rotas públicas, /admin/login, /dashboard/admin/*
    styles/index.css         TODO o CSS (≈ 20 linhas minificadas, classes semânticas + variáveis)
    components/layout/PublicLayout.tsx    header/topline/nav mobile/footer
    components/SearchPanel.tsx            busca de imóveis (não funcional)
    components/PropertyCard.tsx           card demonstrativo
    components/dashboard/DashboardLayout.tsx  sidebar + topbar + guarda de rota
    features/auth/           contexto + provider Appwrite (admin via Team)
    lib/appwrite/client.ts   SDK configurado por VITE_*
    pages/                   Home, Login, AdminLogin, Placeholder, 404, dashboard/*
  appwrite/                  README de provisionamento, schema.md, função ingest-lead
  appwrite-auth-next/        experimento Next.js 16 (SSR + proxy com API key) — repo Git próprio
  README_DEPLOY_HOSTINGER.md roteiro de deploy
```

## 3. Tecnologias encontradas × exigidas

| Exigida | Fortt | Situação |
|---|---|---|
| React | 19.3.1 | ✅ |
| TypeScript | 6.0.3 (strict) | ✅ |
| Vite | 8.3.5 | ✅ |
| Tailwind CSS | 4.3.3 via `@tailwindcss/vite` | ⚠️ instalado, mas **praticamente não usado** — o CSS é escrito à mão em `index.css` |
| HTML semântico / responsivo | header/nav/main/footer/section, skip-link, `aria-*`, 3 breakpoints, `prefers-reduced-motion` | ✅ |
| React Router | `react-router-dom` 7.18.4 | ✅ (v8 já disponível) |
| Supabase (DB/Auth/Storage/Functions/RLS) | **Ausente — usa Appwrite** | ❌ substituir |
| dnd-kit, TanStack Query, RHF + Zod, Recharts | Ausentes | — a adicionar |
| Lucide React | 1.61.0 | ✅ |
| Testes | Vitest 5 + Testing Library (1 teste) | ⚠️ cobertura mínima |
| Build → `dist/` | `tsc -b && vite build` | ✅ |

## 4. Rotas existentes (Fortt)

| Rota | Conteúdo | Estado |
|---|---|---|
| `/` | Home: hero com busca, vitrine de 4 cards, sobre, CTA, footer | Completa (conteúdo demonstrativo rotulado) |
| `/imoveis`, `/comprar`, `/alugar`, `/favoritos`, `/sobre`, `/anuncie-seu-imovel`, `/contato`, `/privacidade` | `PlaceholderPage` | Placeholder |
| `/login` | Área do cliente com **cadastro público aberto** | Funcional se Appwrite configurado |
| `/admin/login` | Login administrativo | Funcional se Appwrite configurado |
| `/admin` | Redireciona para `/dashboard/admin` | — |
| `/dashboard/admin/*` | Dashboard: indicadores “—”, gráfico ilustrativo, agenda fictícia | Esqueleto |
| `*` | 404 (apenas no cliente; servidor responde 200) | — |

## 5. Componentes e design da landing page

| Seção da Home | Elementos | Reaproveitamento no produto |
|---|---|---|
| Header | topline, logo, nav desktop, menu mobile com `aria-expanded`, links de ação | ✅ vira bloco `site-header` configurável |
| Hero | imagem de fundo + gradiente, logo, eyebrow, H1 com destaque, texto, link | ✅ bloco `hero` (variante “imagem de fundo”) |
| Painel de busca | formulário de imóveis | ❌ específico de imobiliária; substituído por formulário de captação |
| Vitrine | grade de 4 cards com hover | ✅ bloco `cards` genérico (serviços/produtos) |
| Sobre | moldura com monograma + texto + benefícios | ✅ bloco `about` / `features` |
| CTA | faixa escura com botão | ✅ bloco `cta-band` |
| Footer | 4 colunas, links, dados comerciais | ✅ bloco `site-footer` alimentado por `business_settings` |

**Design atual:** tokens em CSS custom properties (`--brand-black`, `--brand-gold`, `--surface-cream`…), tipografia Cinzel (títulos) + Montserrat (texto), cantos retos, sombras suaves, alto contraste preto/dourado. A identidade é forte e coerente, mas **está acoplada à marca Fortt** (cores e fontes fixas, logo hardcoded em 4 lugares). Para o produto, essas propriedades viram **tema configurável**; a identidade Fortt pode virar um tema pré-definido (“Elegante escuro”).

**Dashboard atual:** reaproveita as mesmas cores da marca no admin — o oposto do exigido (admin deve ter design próprio e neutro, independente do tema do site).

## 6. Integrações

| Integração | Estado |
|---|---|
| Appwrite Auth | Login e-mail/senha; admin = membro do Team `fortt_admins` (verificado no cliente). |
| Appwrite TablesDB | Schema documentado em `appwrite/schema.md` (imóveis público/privado, imagens, leads, settings, versões, auditoria) — **não versionado como código**. |
| Função `ingest-lead` | POST com honeypot e validação básica. **Sem rate limit, sem `ip_hash`, e-mail não validado, `source`/`leadType` aceitos livremente, variável `FORTT_ADMIN_TEAM_ID` não documentada.** Nenhum formulário a utiliza. |
| Google Fonts | Via `<link>` no `index.html`. |
| Supabase | **Não configurado.** |
| Analytics | Nenhum. |

Conceitos bons a herdar do schema Appwrite: separação público/privado, `ip_hash` em leads, `content_versions` (rascunho × publicado), `audit_logs`, “nada de create público em leads”.

## 7. Processo de build e deploy

- `npm run build` = `tsc -b && vite build` → `dist/` ✅ (verificado; 1964 módulos, 1,5 s).
- `public/.htaccess` copiado para `dist/`: fallback SPA + `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Faltam:** redirect HTTPS, HSTS, CSP, `frame-ancestors`, cache imutável para `/assets/*`, `no-cache` para `index.html`, compressão, 404 real.
- `README_DEPLOY_HOSTINGER.md` é um bom roteiro base (enviar o *conteúdo* de `dist/` para `public_html/`, não enviar `src/.env/.git/node_modules`). `VITE_SITE_URL` é documentado mas não usado.

## 8. Resultado das verificações (2026-11-09)

| Comando | Resultado |
|---|---|
| `tsc -p tsconfig.app.json --noEmit` | ✅ sem erros |
| `tsc -p tsconfig.node.json --noEmit` | ✅ sem erros |
| `eslint .` | ✅ 0 erros, 0 avisos |
| `vitest run` | ✅ 1/1 teste |
| `vite build` (saída no scratchpad, `dist/` do Fortt preservado) | ✅ JS 454,26 kB (gzip 125,65 kB) · CSS 25 kB (gzip 6,3 kB) |

## 9. Pontos positivos

1. Stack já é exatamente a exigida (exceto backend) e em versões atuais.
2. TypeScript estrito, ESLint flat config e Vitest configurados.
3. HTML semântico e acessibilidade cuidadosa (skip-link, foco visível, `aria-*`, movimento reduzido).
4. Honestidade de dados: conteúdo demonstrativo rotulado, dashboard sem números inventados — **alinhado à regra “não usar dados fictícios como reais”**.
5. Home já organizada em seções claras — mapeia diretamente para o modelo de blocos.
6. Visão de segurança correta no papel (Row Security, função para leads, sem chaves em `VITE_*`).
7. `.htaccess` e roteiro Hostinger já existem.

## 10. Problemas identificados

| # | Problema | Gravidade | Evidência |
|---|---|---|---|
| P1 | `land-master` vazio e sem Git | Alta (bloqueia) | §2.1 |
| P2 | Backend Appwrite; exigido Supabase | Alta | `src/lib/appwrite/client.ts` |
| P3 | Dependências em `"latest"` → builds não reproduzíveis | Alta | `package.json:15-39` |
| P4 | Bundle único (admin + SDK no site público), sem code splitting | Alta | build: 454 kB |
| P5 | Cadastro público aberto e autorização admin decidida no cliente; políticas não versionadas nem testadas | Alta | `AdminAuthProvider.tsx:67-73`, `DashboardLayout.tsx:17-19` |
| P6 | Função de leads sem rate limit, validação incompleta, origem falsificável | Alta | `appwrite/functions/ingest-lead/src/main.js:10,24,25` |
| P7 | `.env` não coberto pelo `.gitignore` (só `.env.local`) | Média | `.gitignore:3` |
| P8 | Marca hardcoded (logo, cores, textos, CRECI) em componentes | Média | `PublicLayout.tsx`, `HomePage.tsx`, `DashboardLayout.tsx` |
| P9 | Tailwind instalado mas CSS escrito à mão em um único arquivo minificado | Média | `src/styles/index.css` |
| P10 | Admin usa a identidade visual do site | Média | `.dash-*` em `index.css` |
| P11 | Imagens pesadas (hero PNG 2,16 MB; favicon 554 KB) | Média | `dist/assets` |
| P12 | Sem OG/canonical/sitemap; 404 é soft-404 | Média | `index.html`, `.htaccess` |
| P13 | `.htaccess` sem HTTPS/HSTS/CSP/cache | Média | `public/.htaccess` |
| P14 | API key Appwrite em `appwrite-auth-next/.env.local` dentro da pasta do site | Média | listagem de variáveis (valor não lido) |
| P15 | Documentação desatualizada (cita arquivos inexistentes) | Baixa | `appwrite/README.md:3,12`, `README.md:25` |
| P16 | Lint da raiz varre o subprojeto Next; função JS não é verificada | Baixa | `eslint.config.js:8` |

## 11. O que será aproveitado

| Item | Forma |
|---|---|
| Configs de TS, ESLint, Vitest, Vite | Copiar e ajustar (com versões fixadas) |
| Estrutura de seções da Home | Converter em blocos do renderizador |
| CSS da Home (layout, breakpoints, efeitos) | Reescrever com Tailwind + variáveis de tema |
| Padrões de acessibilidade | Manter (skip-link, foco, aria, reduced-motion) |
| `.htaccess` | Base, ampliada conforme [ESTRATEGIA_PUBLICACAO §9](ESTRATEGIA_PUBLICACAO.md) |
| Roteiro Hostinger | Base de `docs/INSTALACAO_NOVO_CLIENTE.md` (Fase 8) |
| Conceitos do schema Appwrite | Versões de conteúdo, auditoria, `ip_hash`, leitura pública só do publicado |
| Identidade Fortt | Tema pré-definido opcional |

**Não será aproveitado:** SDK/Auth Appwrite, função `ingest-lead`, `appwrite-auth-next/`, SearchPanel/PropertyCard (específicos de imóveis), área do cliente com cadastro público, dados ilustrativos do dashboard.

## 12. Riscos de regressão

| Risco | Mitigação |
|---|---|
| Alterar o Fortt por engano | **Nada será escrito em `sites/forttimobiliaria`.** Todo trabalho ocorre em `land-master`. |
| Perder a fidelidade visual da Home ao portar | Capturar screenshots de referência (Playwright) do Fortt em 1440/768/375 px antes da Fase 4 e comparar com o tema “Elegante escuro”. |
| Se o Fortt for migrado para o produto no futuro | Será uma **instalação** do produto (novo Supabase + tema + conteúdo), não um refactor do repositório atual. Requer plano próprio. |

## 13. Ajustes necessários para integrar a dashboard

1. Criar o projeto em `land-master` com `git init`, `.gitignore` cobrindo `.env*` e `.env.example`.
2. Fixar versões exatas das dependências.
3. Separar o app em dois entry points lógicos (público e admin) via `React.lazy` + rotas, garantindo que o bundle público não importe admin/editor.
4. Substituir Appwrite por `@supabase/supabase-js`; autorização via RLS + `user_roles`.
5. Desativar cadastro público no Supabase Auth; usuários só por convite.
6. Extrair marca/conteúdo para `business_settings` e `pages` (Home).
7. Tema público por CSS variables injetadas em runtime; design system do admin separado.

Detalhamento em [ARQUITETURA_TECNICA](ARQUITETURA_TECNICA.md) e [PLANO_DESENVOLVIMENTO](PLANO_DESENVOLVIMENTO.md).
