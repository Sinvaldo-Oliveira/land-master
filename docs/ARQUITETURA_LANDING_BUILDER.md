# Arquitetura — Landing Page Builder

> 2026-11-11 · Status: **proposta para aprovação**. Complementa [ARQUITETURA_TECNICA](ARQUITETURA_TECNICA.md); não a substitui.
> Base: [AUDITORIA_LANDING_BUILDER](AUDITORIA_LANDING_BUILDER.md).

## 1. Princípios

1. **Módulo, não sistema novo.** Mesmo app React, mesma autenticação, mesmo Supabase, mesmo CRM.
2. **Um renderizador só.** O que o editor mostra no canvas é desenhado pelo mesmo código que o visitante recebe.
3. **Editor fora do bundle público.** O visitante nunca baixa painéis, arrastar e soltar nem validação Zod.
4. **Documento é dado, nunca código.** Lista fechada de tipos de bloco; sem HTML livre, sem JavaScript, sem classes CSS vindas do banco.
5. **Estrutura antes de aparência.** Toda ação do editor (mover, duplicar, estilizar) altera o documento por funções puras e testadas; a tela só reflete.

## 2. Estrutura de pastas

```text
src/
  renderer/                      (público — já existe)
    blocks/                      NOVO: renderizadores dos blocos da landing
      registry.ts                tipo → componente (lista fechada, lazy por grupo)
      structure/  text/  media/  conversion/
    document-v2.ts               tipos do documento em árvore
    style.ts                     tokens de estilo → variáveis CSS e classes fixas
    LandingRenderer.tsx          desenha a árvore
  public-site/
    LandingPage.tsx              NOVO: rota /lp/:slug (chunk próprio)
  modules/
    landing-builder/             (admin — hoje só o aviso)
      pages/                     lista, criação, editor, pré-visualização
      editor/                    barra superior, canvas, painéis, camadas
      blocks/                    definição de cada bloco para o editor
                                 (campos, padrão, regras de filhos, miniatura)
      state/                     documento, histórico (desfazer/refazer), seleção
      schema/                    Zod do documento v2 e migrações de versão
      templates/                 templates originais (dados)
      services/                  chamadas ao Supabase
```

A separação `src/renderer/blocks` (como desenhar) × `src/modules/landing-builder/blocks` (como editar) é o que mantém o editor fora do site público. O `check:bundle` já falha o build se o público importar algo de `src/modules` ou `src/admin`.

## 3. Documento: `PageDocument v2`

A Home continua em v1 (lista plana de seções). Landings usam v2, em árvore:

```ts
type LandingDocument = {
  schemaVersion: 2
  seo: { title: string; description: string; canonical?: string; ogImage?: string; noindex?: boolean; lang?: string }
  theme: SiteTheme                    // mesmo tema da Home (cores, fontes, raio, movimento)
  blocks: Block[]                     // raiz: só blocos do tipo "seção"
}

type Block = {
  id: string                          // estável, único no documento
  type: BlockType                     // lista fechada
  v: number                           // versão do esquema do bloco
  props: Record<string, unknown>      // conteúdo, validado pelo esquema do tipo
  style?: BlockStyle                  // tokens (ver §5), nunca CSS livre
  responsive?: { tablet?: Partial<BlockStyle>; mobile?: Partial<BlockStyle>; hideOn?: Device[] }
  animation?: { type: AnimationPreset; duration?: number; delay?: number }
  children?: Block[]                  // só em contêineres
}
```

Limites validados no painel e no banco: até 200 blocos, profundidade máxima 4 (seção → colunas/grade → coluna → elemento), documento ≤ 512 kB (limite que já existe em `pages`).

**Seções completas.** As 13 seções atuais entram como blocos-folha do nível raiz (`type: 'hero'`, `'faq'`, …) com as mesmas `props` de hoje. O renderizador v2 as delega aos componentes existentes. Assim os templates nascem ricos desde a primeira entrega, e os primitivos chegam aos poucos.

**Migração.** `migrateDocument(doc)` roda ao carregar e ao salvar. `v1 → v2` embrulha cada seção num bloco. Bloco de tipo desconhecido é ignorado na renderização e sinalizado no editor (nunca quebra a página).

## 4. Registro de blocos

Cada tipo tem duas metades, ligadas pelo mesmo `type`:

| Metade | Onde | Conteúdo |
|---|---|---|
| Renderização | `src/renderer/blocks/` | Componente React, estilos, comportamento público. |
| Edição | `src/modules/landing-builder/blocks/` | Esquema Zod das `props`, valores padrão, campos do painel (o padrão `FieldDef` que já existe), regras de filhos (`accepts`, `maxChildren`), categoria, nome e miniatura. |

Regras de estrutura ficam em dados, e uma única função `canInsert(parent, child)` (em `src/renderer/document-v2.ts`, usada pelo renderizador, pela validação e pelo editor) decide tudo: arrastar, colar, duplicar e a árvore de camadas usam a mesma regra.

## 5. Estilo sem classes dinâmicas

O banco nunca guarda classe Tailwind. Guarda **tokens** de listas fechadas, e o renderizador os traduz:

| Propriedade | Valores guardados | Como vira CSS |
|---|---|---|
| Espaçamento (padding, margem, gap) | degraus `0, 8, 16, 24, 32, 48, 64, 96, 128, 160` | variável CSS no `style` do bloco |
| Tamanho de texto | 7 passos da escala fluida | classe fixa por passo (existe no build) |
| Peso, alinhamento, largura máxima | enumerações | classe fixa por valor |
| Cores | `#rrggbb` validado, ou referência ao tema | variável CSS; contraste recalculado por `surface.ts` |
| Fundo | cor, degradê de até 3 cores, imagem + sobreposição | `background` montado só com valores validados |
| Raio e sombra | enumerações do tema | classe fixa |

Overrides por dispositivo usam a mesma tabela, aplicados em cascata do maior para o menor (desktop → tablet → mobile) por variáveis CSS com `@media`. Um ajuste no celular não altera o desktop.

## 6. Editor

```text
┌ ← Páginas │ Nome ● Salvo │ ↶ ↷ │ 🖥 ⬚ 📱 │ Pré-visualizar │ Salvar │ Publicar ┐
├────────────┬──────────────────────────────────────┬─────────────────────┤
│ Blocos     │        canvas (iframe, tema do site) │ Propriedades        │
│ Camadas    │   seleção · barra ↑ ↓ ⧉ 🗑 · inserir  │ Conteúdo│Estilo│📱│✨ │
└────────────┴──────────────────────────────────────┴─────────────────────┘
```

- **Modo de edição (Etapa 2):** o `LandingRenderer` recebe ganchos opcionais (`edit.attrs` e `edit.placeholder`). O painel usa `attrs` para marcar cada bloco (`data-block-id`, seleção, clique) no próprio elemento do bloco, sem embrulhar os elementos, então o HTML do canvas é o do site. O site público não passa os ganchos e não carrega nada do editor.
- **Canvas em iframe** (o `PreviewFrame` atual, evoluído): só o iframe dá largura de viewport real, então os breakpoints do site funcionam de verdade em Desktop (1440), Tablet (768) e Mobile (375). O conteúdo é o `LandingRenderer` em modo de edição: links e formulários não disparam, e cada bloco ganha contorno de seleção e barra de ações.
- **Estado:** o documento vive em um histórico imutável (`state/history.ts`: passado, presente e futuro; limite de 100 passos; alterações do mesmo campo em menos de 1 s viram um passo só). Todas as transições são funções puras em `state/`, testadas sem React. "Não salvo" é a comparação de referência entre o presente e o documento salvo, então desfazer até o ponto salvo volta a "Tudo salvo".
- **Arraste e canvas em escala:** `editor/canvas-geometry.ts` converte pontos e retângulos entre o painel e o iframe. A barra do bloco selecionado e o indicador de destino são desenhados pelo painel, por cima do canvas, e não dentro do iframe.
- **Autosave:** 2 s após a última mudança, com os estados "Salvando", "Salvo", "Alterações não salvas" e "Erro ao salvar". Usa o `p_expected_updated_at` que já existe para não sobrescrever outra sessão.
- **Telas pequenas:** abaixo de 1024 px o editor avisa e oferece só pré-visualização (já previsto no DESIGN_SYSTEM §A.6).

### Bibliotecas avaliadas

| Biblioteca | Decisão | Motivo |
|---|---|---|
| `@dnd-kit/core` 6.3.1 | **Instalada na Etapa 3**, só no admin | Cuida do gesto (início com distância mínima, fim, cancelamento, toque) e do cartão que acompanha o ponteiro. Declara React ≥ 16.8 e roda com o React 19 do projeto. O pacote `sortable` **não** foi instalado: o destino é calculado pelo editor (`resolveDrop`) a partir da posição do ponteiro, porque o canvas é um iframe em escala e a regra de estrutura precisa ser uma só. O sensor de teclado da biblioteca não é usado; o caminho de teclado são os atalhos e os botões de mover. |
| Zustand | **Não adotar agora** | `useReducer` + contexto resolve o estado do editor; adotar só se a medição mostrar re-renderização excessiva. |
| TanStack Query, RHF, Zod, lucide, sonner | Já instaladas | Reutilizar. |
| Biblioteca de animação | Não adotar | CSS + IntersectionObserver (ADR-010). |

O arraste nativo usado hoje nas pastas da Home fica como está; não vale reescrever o que funciona.

## 7. Rotas e bundles

| Rota | Chunk | Observação |
|---|---|---|
| `/admin/paginas` | lista | já registrada |
| `/admin/paginas/nova` | criação e templates | |
| `/admin/paginas/:id` | editor (o maior chunk do admin) | |
| `/admin/paginas/:id/previa` | pré-visualização sem painéis | exige sessão de admin |
| `/lp/:slug` | `LandingPage` + blocos usados | público, fora do bundle inicial |

Meta: o bundle público inicial continua ≤ 120 kB gzip; a rota `/lp/:slug` soma no máximo 45 kB gzip além dele, antes dos blocos pesados opcionais.

## 8. Segurança

- Escrita só por RPC com `has_role('admin')`; leitura pública só da versão **publicada**, por função `security definer` (nenhuma tabela legível por `anon`).
- Links sempre por `safeHref` (bloqueia `javascript:` e afins); mídias só `https`; cores só `#rrggbb`; nenhum `dangerouslySetInnerHTML`.
- Formulários públicos só por Edge Function, com validação no servidor, limite de taxa, honeypot e chave de idempotência (ADR-006).
- Pré-visualização de rascunho só dentro do admin. Não existe URL pública de rascunho.

## 9. Decisões registradas

| ID | Decisão | Status |
|---|---|---|
| ADR-L1 | Landings reutilizam `pages`/`page_versions`; sem tabelas `landing_*` paralelas. | Proposta |
| ADR-L2 | `PageDocument v2` em árvore para landings; Home segue em v1; seções atuais viram blocos. | **Aceita** (2026-11-11) |
| ADR-L3 | Canvas em iframe com o renderizador público em modo de edição. | Proposta |
| ADR-L4 | Estilo por tokens e variáveis CSS; nenhuma classe vinda do banco. | Proposta |
| ADR-L5 | `@dnd-kit` no admin (Etapa 3); sem Zustand na v1. | **Aceita** (2026-11-11) |
| ADR-L6 | Rota pública `/lp/:slug`. | **Aceita** (2026-11-11) |
| ADR-L7 | Templates como dados no repositório, copiados ao criar a página. | **Aceita** (2026-11-11) |
| ADR-L8 | Rota do painel continua em `/admin/paginas`. | **Aceita** (2026-11-11) |
