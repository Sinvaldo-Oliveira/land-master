# Desenvolvimento Local

> Atualizado em 2026-11-09 (Fase 2).

## 1. Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | ≥ 22.12 (testado com 22.20) | React Router 8 e jsdom 31 exigem ≥ 22.22 — por isso o projeto usa React Router 7 e jsdom 27 |
| npm | ≥ 11 | |
| Git | qualquer recente | |
| Docker Desktop | opcional | Só para Supabase **local** (`supabase start`) e para rodar os testes pgTAP localmente |

## 2. Primeiros passos

```bash
npm ci                         # instala exatamente as versões do package-lock.json
npx playwright install chromium  # navegador dos testes E2E (uma vez por máquina)
cp .env.example .env.local     # depois preencha (ver §3)
npm run dev                    # http://localhost:5173  ·  painel em /admin
```

Sem `.env.local` o app funciona em modo “não configurado”: o site mostra “Site em configuração” e o login avisa que o Supabase não foi configurado.

## 3. Supabase de desenvolvimento (projeto na nuvem)

Como esta máquina não tem Docker, o desenvolvimento usa um **projeto Supabase exclusivo de desenvolvimento** (nunca o de produção de um cliente).

1. Em [supabase.com](https://supabase.com), crie um projeto (ex.: `vendas-dev`), região São Paulo.
2. **Authentication → Sign In / Providers → Email:** desative “Allow new users to sign up”.
3. **Authentication → URL Configuration:**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/admin/redefinir-senha` e `http://localhost:4173/admin/redefinir-senha`
4. **Authentication → Policies de senha:** mínimo 10 caracteres, “letters and digits”.
5. Aplique as migrações:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push          # aplica supabase/migrations/*
   npm run db:types              # regenera src/types/database.ts
   ```
6. Preencha `.env.local` com **Project URL** e **Publishable key** (Settings → API Keys). Nunca use a *secret/service_role key* no frontend.
7. Crie o primeiro administrador:
   - Authentication → Users → **Invite user** (seu e-mail).
   - Abra o e-mail, defina a senha em `/admin/redefinir-senha`.
   - No **SQL Editor**: `select public.bootstrap_first_admin('seu@email.com');`
8. Entre em `http://localhost:5173/admin`.

## 4. Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção em `dist/` |
| `npm run preview` | Serve o `dist/` localmente |
| `npm run lint` | ESLint (inclui acessibilidade e proibição de `dangerouslySetInnerHTML`/`eval`) |
| `npm run typecheck` | TypeScript estrito |
| `npm run test` | Testes unitários e de componentes (Vitest) |
| `npm run test:e2e` | Testes E2E (Playwright) — sobe dois builds de teste sozinho |
| `npm run check:bundle` | Orçamento de tamanho e isolamento do admin (após o build) |
| **`npm run verify`** | lint + typecheck + test + build + check:bundle — **obrigatório antes de concluir qualquer fase** |
| `npm run db:types` | Gera tipos do banco a partir do projeto vinculado |

## 5. Testes E2E

- **foundation.spec.ts** — roda contra o build de produção **sem** Supabase (desktop e celular).
- **admin-shell.spec.ts** — roda contra um build com `.env.e2e`, que aponta para um Supabase **fictício** (`e2etest.supabase.co`). O Playwright intercepta todas as chamadas para esse host e simula sessão e perfil (admin, gestor, operador, sem perfil). Nada sai da máquina. Testa o layout em 1440 px, 768 px e celular e salva capturas em `test-results/`.
- Fluxos com login real (Supabase de verdade) entram quando o projeto de desenvolvimento existir.

## 6. Testes do banco (pgTAP)

`supabase/tests/database/*.test.sql` testam RLS e funções por perfil.

```bash
npx supabase test db            # requer Docker (Supabase local)
```

Sem Docker, a sintaxe é validada com o parser oficial do Postgres (libpg_query); a execução real fica pendente até haver Docker ou um banco de testes descartável.

## 7. Estrutura

Ver [ARQUITETURA_TECNICA §3](ARQUITETURA_TECNICA.md#3-estrutura-de-pastas). Regras principais:
- `src/public-site/` e `src/renderer/` **nunca** importam de `src/admin/` ou `src/modules/` (o `check:bundle` falha se isso acontecer).
- Componentes de interface do admin ficam em `src/admin/ui/` e usam apenas tokens `admin-*`.
- Cada módulo em `src/modules/<nome>/` tem export default da página (carregada sob demanda).
