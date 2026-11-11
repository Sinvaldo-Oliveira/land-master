# Publicação de landing pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir publicar landings no editor e renderizá-las publicamente em `/lp/:slug` sem expor rascunhos.

**Architecture:** Uma RPC pública retorna somente a versão imutável apontada pela landing publicada. O editor reutiliza `publish_page`; a rota pública lazy busca e valida o documento antes de entregá-lo ao `LandingRenderer`.

**Tech Stack:** React, React Router, TypeScript, Supabase/PostgREST, Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-publicacao-landing-design.md`

## Global Constraints

- Manter rascunhos privados e publicar apenas por `publish_page`.
- Não adicionar dependências ao bundle público.
- A leitura pública deve usar RPC `security definer`, `stable`, com `search_path` vazio e permissão explícita para `anon`.
- Rota pública obrigatória: `/lp/:slug`.

## Review Focus

- Slug de rascunho, arquivada ou fora do ar deve responder 404; teste da rota pública.
- Edição posterior à publicação não pode alterar a versão lida por visitante; teste da RPC falsa.
- Documento publicado inválido não pode quebrar a tela pública; teste de fallback 404.
- Erro de publicação deve manter rascunho e comunicar a falha; teste do editor.
- Ação de abrir deve aparecer somente para status publicado; teste da lista.

---

### Task 1: Contratos de publicação e leitura pública

**Files:**
- Create: `supabase/migrations/20261111170000_public_landing_pages.sql`
- Modify: `src/types/database.ts`
- Modify: `src/modules/landing-builder/services/pages.ts`
- Modify: `src/modules/landing-builder/services/pages.test.ts`
- Modify: `tests/e2e/fake-landing-backend.ts`

**Interfaces:**
- Produces `publishLandingPage(pageId)` e `fetchPublishedLanding(slug, signal?)`.
- Produces RPC `get_public_landing(p_slug text) returns jsonb`.

- [ ] Write unit tests for the publish RPC client and the public payload parser.
- [ ] Run the focused test and observe failure because the functions do not exist.
- [ ] Add the migration, generated type, RPC clients and fake backend support.
- [ ] Run focused tests and verify success.

### Task 2: Editor, lista e rota pública

**Files:**
- Create: `src/public-site/LandingPage.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/modules/landing-builder/pages/LandingEditorPage.tsx`
- Modify: `src/modules/landing-builder/pages/LandingPagesPage.tsx`
- Modify: `tests/e2e/landing-editor.spec.ts`
- Create: `tests/e2e/public-landing.spec.ts`

**Interfaces:**
- Consumes `publishLandingPage` and `fetchPublishedLanding` from Task 1.
- Produces a public `/lp/:slug` page and editor publication controls.

- [ ] Write E2E coverage for publishing, opening the public route, and rejecting draft URLs.
- [ ] Run the new E2E tests and observe failure because publish/route are absent.
- [ ] Implement the UI using existing `Button`, `Badge`, `Tooltip`, status text and `LandingRenderer` patterns.
- [ ] Run focused E2E tests and verify success.

### Task 3: Regression verification

**Files:**
- Modify: `docs/AUDITORIA_LANDING_BUILDER.md`

- [ ] Run `npm run verify`.
- [ ] Run the full Playwright suite against a newly built preview.
- [ ] Record results and the known Windows teardown behavior in the audit.
