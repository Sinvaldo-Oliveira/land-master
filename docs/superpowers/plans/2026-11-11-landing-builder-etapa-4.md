# Landing Page Builder — Etapa 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar estilos por tokens, overrides responsivos, os blocos previstos para a Etapa 4 e o kit de identidade herdado da Home.

**Architecture:** `LandingDocument` continua no schema v2 e recebe somente dados validados: `style`, `responsive` e `identity`. O renderer converte tokens em variáveis CSS e classes fixas; a Home é a fonte da identidade para páginas novas. O editor expõe Conteúdo, Estilo e Responsivo sem aceitar CSS ou classes livres.

**Tech Stack:** React 19, TypeScript 6, Zod 4, Tailwind CSS 4, Vitest, Testing Library, Playwright.

**Spec:** `docs/PRD_LANDING_PAGE_BUILDER.md`, `docs/ARQUITETURA_LANDING_BUILDER.md`, `docs/DESIGN_SYSTEM_LANDING_BUILDER.md`, `docs/COMPONENTES_LANDING_BUILDER.md`

## Global Constraints

- Nenhuma classe CSS, HTML ou script pode vir do banco.
- Desktop é a base; tablet e mobile herdam e só sobrescrevem tokens explícitos.
- A Home permanece em `PageDocument v1`; landings permanecem em `LandingDocument v2`.
- Documentos v2 já salvos, sem os novos campos, devem continuar abrindo.
- O bundle público inicial deve permanecer abaixo de 120 kB gzip e sem código do admin.
- Toda ação por arraste mantém alternativa por clique ou teclado.

## Review Focus

- Documento antigo sem `identity`, `style` ou `responsive` abre com defaults seguros.
- Token adulterado, classe CSS e valor livre são recusados antes de salvar.
- Override mobile não altera desktop/tablet; remoção do override volta a herdar.
- Blocos contêiner não aceitam filhos fora da hierarquia permitida.
- Links de WhatsApp, vídeo e imagem passam pelas mesmas barreiras de URL segura do renderer.

---

### Task 1: Núcleo de estilos, responsividade e identidade

**Files:**
- Modify: `src/renderer/document-v2.ts`
- Create: `src/renderer/block-style.ts`
- Modify: `src/renderer/site.css`
- Modify: `src/modules/landing-builder/schema/document.ts`
- Test: `src/modules/landing-builder/schema/document.test.ts`
- Test: `src/renderer/LandingRenderer.test.tsx`

**Interfaces:**
- Produces: `BlockStyle`, `BlockResponsive`, `LandingIdentity`, `blockStyleProps(block)` e migração retrocompatível.

- [ ] Escrever testes falhando para tokens válidos/inválidos, migração e cascata por dispositivo.
- [ ] Executar os testes e confirmar falha pela ausência das interfaces.
- [ ] Implementar tipos, validação estrita, variáveis CSS e regras de breakpoint.
- [ ] Executar testes focados e a suíte unitária.

### Task 2: Abas Estilo e Responsivo

**Files:**
- Create: `src/modules/landing-builder/editor/StylePanel.tsx`
- Create: `src/modules/landing-builder/editor/ResponsivePanel.tsx`
- Modify: `src/modules/landing-builder/editor/PropertiesPanel.tsx`
- Modify: `src/modules/landing-builder/pages/LandingEditorPage.tsx`
- Modify: `src/modules/landing-builder/state/editor.ts`
- Test: `src/modules/landing-builder/state/editor.test.ts`
- Test: `tests/e2e/landing-editor.spec.ts`

**Interfaces:**
- Consumes: tokens e tipos da Task 1.
- Produces: `setBlockStyle`, `setBlockResponsive` e painel com herança explícita.

- [ ] Escrever testes falhando para atualização imutável, remoção de override e histórico.
- [ ] Implementar as transições puras.
- [ ] Implementar tabs e controles enumerados/cores validadas.
- [ ] Cobrir edição desktop/mobile no E2E.

### Task 3: Blocos estruturais, mídia e conversão

**Files:**
- Modify: `src/renderer/document-v2.ts`
- Modify: `src/modules/landing-builder/schema/document.ts`
- Modify: `src/modules/landing-builder/blocks/definitions.ts`
- Modify: `src/renderer/blocks/elements.tsx`
- Modify: `src/renderer/LandingRenderer.tsx`
- Test: `src/modules/landing-builder/blocks/definitions.test.ts`
- Test: `src/modules/landing-builder/schema/document.test.ts`
- Test: `src/renderer/LandingRenderer.test.tsx`

**Interfaces:**
- Produces: Colunas, Coluna, Grade, Lista, Selo, Ícone, Vídeo, Botão WhatsApp e Lista de benefícios.

- [ ] Escrever testes falhando para catálogo, defaults, hierarquia, URLs e renderização sem HTML livre.
- [ ] Ampliar a regra única `canInsert` e os esquemas estritos.
- [ ] Implementar definições e renderizadores sem dependência nova.
- [ ] Executar testes focados e suíte unitária.

### Task 4: Kit de identidade aplicado a páginas novas

**Files:**
- Modify: `src/modules/landing-builder/services/pages.ts`
- Modify: `src/modules/landing-builder/blocks/definitions.ts`
- Modify: `src/modules/landing-builder/pages/NewLandingPage.tsx`
- Test: `tests/e2e/landing-pages.spec.ts`
- Test: `src/modules/landing-builder/blocks/definitions.test.ts`

**Interfaces:**
- Consumes: `LandingIdentity` da Task 1.
- Produces: extração segura da Home e defaults de marca para header, footer e WhatsApp.

- [ ] Escrever testes falhando para herança e fallback sem Home.
- [ ] Extrair identidade do rascunho da Home e gravá-la no novo documento.
- [ ] Aplicar identidade ao criar blocos dependentes de marca.
- [ ] Atualizar a explicação da tela de criação e o E2E.

### Task 5: Auditoria final e documentação

**Files:**
- Modify: `docs/AUDITORIA_LANDING_BUILDER.md`
- Modify: `docs/PLANO_IMPLEMENTACAO_LANDING.md`

**Interfaces:**
- Consumes: resultado verificado das Tasks 1–4.

- [ ] Registrar achados da auditoria, correções e pendências externas/preexistentes.
- [ ] Rodar `npm run verify` e `npm run test:e2e` completos.
- [ ] Confirmar orçamento do bundle e ausência de classes vindas do documento.
- [ ] Revisar o diff e o status Git sem tocar nas exclusões locais de `.env.example` e `.env.e2e`.
