# Design System

> Versão 0.1 · 2026-11-09 · Status: **proposta para revisão**

O produto tem **duas camadas visuais independentes**:

| Camada | Quem define | Muda por cliente? | Onde vive |
|---|---|---|---|
| **Admin** (dashboard, CRM, editor) | Nós (produto) | Não — só o logo do cliente aparece na sidebar | `src/admin/ui/`, tokens `--admin-*` |
| **Site público** (Home, landing pages) | O cliente, pela dashboard | Sim — tema configurável | `src/renderer/theme/`, tokens no padrão shadcn com escopo `.site-root` |

Regra: um componente do admin **nunca** lê os tokens de `.site-root`, e um bloco público **nunca** lê `--admin-*`. A pré-visualização do editor aplica o tema apenas no `.site-root` do canvas.

Referências visuais do site público e do construtor: [REFERENCIAS_VISUAIS](REFERENCIAS_VISUAIS.md) (21st.dev e motionsites.ai).

---

## Parte A — Admin

### A.1 Direção: “Livro-caixa”

Uma ferramenta de trabalho que parece um instrumento bem afinado, não um template de painel. Referências: livro contábil, ficha de arquivo, sinalização de escritório.

- **Superfícies de papel quente** em vez de cinza-azulado genérico; **sidebar em tinta** quase preta.
- **Um único acento forte** (verde-verdete) para ação primária e seleção; as cores semânticas ficam contidas em selos e alertas.
- **Números como protagonistas:** valores e KPIs em fonte mono tabular, grandes, alinhados como em um livro-caixa.
- **Réguas finas** (1 px) separando informação, densidade controlada, cantos discretos (6 px).
- Hierarquia por tipografia e espaço, não por sombras pesadas.

### A.2 Tokens

```css
@theme {
  /* Superfícies */
  --color-admin-paper:     #F6F4EE;  /* fundo da área de trabalho */
  --color-admin-card:      #FFFFFF;
  --color-admin-sunken:    #EEEBE3;  /* inputs, células de cabeçalho */
  --color-admin-ink:       #15171C;  /* sidebar, texto principal */
  --color-admin-ink-2:     #4A4F5A;  /* texto secundário */
  --color-admin-ink-3:     #7C818C;  /* rótulos, placeholders (AA em card) */
  --color-admin-rule:      #DEDAD0;  /* bordas/réguas */

  /* Acento e estados */
  --color-admin-accent:        #0E7C66;  /* verdete — ação primária, seleção */
  --color-admin-accent-hover:  #0A6553;
  --color-admin-accent-soft:   #DDF0EA;
  --color-admin-success:       #2F7D32;
  --color-admin-warning:       #B26A00;
  --color-admin-danger:        #B42318;
  --color-admin-info:          #2B5FA8;

  /* Tipografia */
  --font-admin-display: "Bricolage Grotesque", ui-sans-serif, sans-serif;  /* títulos de página */
  --font-admin-body:    "Figtree", ui-sans-serif, sans-serif;              /* interface */
  --font-admin-mono:    "IBM Plex Mono", ui-monospace, monospace;          /* valores, KPIs, IDs */

  /* Escala (rem) */
  --text-admin-xs: .75rem;  --text-admin-sm: .8125rem; --text-admin-base: .875rem;
  --text-admin-lg: 1rem;    --text-admin-xl: 1.25rem;  --text-admin-2xl: 1.625rem; --text-admin-kpi: 2rem;

  /* Espaço: base 4 px (Tailwind padrão) · Raio · Sombra */
  --radius-admin: 6px;  --radius-admin-lg: 10px;
  --shadow-admin-pop: 0 8px 24px -8px rgb(21 23 28 / .18);  /* só popovers, menus, modais */
}
```

Modo escuro do admin: P2 (tokens já nomeados semanticamente para permitir).

Contraste verificado (WCAG AA): `ink` sobre `paper`, `ink-2` sobre `card`, branco sobre `accent` ≥ 4,5:1. `ink-3` restrito a texto ≥ 13 px sobre `card`.

### A.3 Layout

```
┌──────────┬───────────────────────────────────────────────────────┐
│ [logo]   │ Título da página        [busca ⌘K]  [+ Novo ▾]  [👤]  │ ← topbar 56 px, régua inferior
│          ├───────────────────────────────────────────────────────┤
│ Painel   │                                                       │
│ Contatos │   conteúdo — largura máx. 1440 px, gutter 24 px       │
│ CRM      │                                                       │
│ Site     │                                                       │
│ Páginas  │                                                       │
│ Formul.  │                                                       │
│ Relatór. │                                                       │
│ ──────── │                                                       │
│ Config.  │                                                       │
│ Ver site↗│                                                       │
└──────────┴───────────────────────────────────────────────────────┘
  240 px (recolhível p/ 64 px)        < 1024 px: sidebar vira gaveta
```

- Itens da sidebar filtrados por perfil (Operador não vê Site, Páginas, Formulários, Configurações).
- Item ativo: barra de 3 px em `accent` à esquerda + texto branco; restante em `ink` 70%.
- Botão “+ Novo” global: contato, oportunidade, tarefa, landing page.
- Editor de páginas usa **layout de tela cheia** próprio (sem sidebar).

### A.4 Componentes

| Componente | Base | Notas |
|---|---|---|
| Button | nativo | `primary` (accent), `secondary` (borda rule), `ghost`, `danger`; tamanhos `sm/md`; estado `loading` com spinner e texto mantido |
| Input, Textarea, Select, Checkbox, Switch | nativo + Radix (Select, Switch, Checkbox) | rótulo sempre visível; erro abaixo com ícone; `aria-describedby` |
| Combobox (contato, responsável) | Radix Popover + lista | busca com debounce |
| Dialog (confirmação, formulários curtos) | Radix Dialog | exclusão exige digitar o nome quando irreversível |
| Sheet (painel lateral) | Radix Dialog | detalhe de oportunidade/contato sem sair do Kanban |
| DropdownMenu, Tooltip, Tabs, Popover | Radix | |
| Toast | sonner | sucesso 4 s; erro persiste até fechar; ação “Desfazer” quando aplicável |
| DataTable | própria | busca, filtros em chips, ordenação, paginação por cursor, seleção, densidade |
| StatCard (KPI) | própria | rótulo · valor mono · variação vs. período anterior · link “como é calculado” (tooltip com a definição do PRD §5) |
| EmptyState | própria | ícone, frase do que aparece aqui, ação primária. Nunca números de exemplo |
| Skeleton | própria | formato do conteúdo final; nada de spinner de página inteira |
| ErrorState | própria | mensagem humana + “Tentar novamente” + código de referência |
| Badge | própria | estágio, status, perfil; cor + texto (nunca só cor) |
| KanbanBoard / KanbanColumn / DealCard | dnd-kit | ver A.5 |

### A.5 Kanban

```
┌ Novo lead · 12 · R$ 48.300 ┐  ← nome, contagem, soma (mono), régua com a cor da etapa
│ ┌────────────────────────┐ │
│ │ Reforma cozinha        │ │  título (semibold)
│ │ Maria Souza            │ │  contato (ink-2)
│ │ R$ 12.500,00      [MS] │ │  valor mono · avatar do responsável
│ │ ⏰ Ligar · amanhã       │ │  próxima ação; vermelho se atrasada
│ └────────────────────────┘ │
```
- Arrastar: card “levanta” (sombra `pop`, leve rotação 1°), coluna de destino com fundo `accent-soft`.
- Teclado: `Espaço` pega, setas movem, `Espaço` solta, `Esc` cancela; anúncios via `aria-live` (dnd-kit `announcements` em pt-BR).
- Falha ao salvar: card volta com animação curta + toast de erro.
- Colunas com rolagem própria; contagem/soma sempre visíveis no topo.

### A.6 Editor de páginas

```
┌ ← Páginas │ Nome da página  ● Rascunho salvo │ ↶ ↷ │ 🖥 ⬚ 📱 │ Pré-visualizar │ Publicar ┐
├───────────┬─────────────────────────────────────────────┬──────────────────────┤
│ Blocos    │                                             │ Propriedades         │
│ ▸ Seções  │           canvas (tema do site)             │ [Conteúdo|Estilo|📱] │
│ ▸ Texto   │   seleção: contorno 2 px accent + rótulo    │                      │
│ ▸ Mídia   │   hover: contorno tracejado                 │                      │
│ ▸ Form.   │   barra flutuante: ↑ ↓ ⧉ 🗑                  │                      │
│ Camadas   │                                             │                      │
└───────────┴─────────────────────────────────────────────┴──────────────────────┘
   280 px                                                      320 px
```
- Atalhos: `Ctrl+Z / Ctrl+Shift+Z`, `Ctrl+D` duplicar, `Del` excluir, `Ctrl+S` salvar, setas navegam entre blocos.
- Abaixo de 1024 px: editor mostra aviso “use uma tela maior” e permite apenas edição de texto e pré-visualização.

### A.7 Movimento
Durações 120 ms (hover/foco), 200 ms (painéis, menus), 280 ms (Sheet). Easing `cubic-bezier(.2,.8,.2,1)`. Tudo desativado com `prefers-reduced-motion`.

### A.8 Escrita na interface
- pt-BR, frases curtas, verbo no botão (“Salvar contato”, não “OK”).
- Erros dizem o que aconteceu e o que fazer.
- Moeda/data/número sempre via `Intl` com o locale e fuso da empresa.

---

## Parte B — Site público (tema configurável)

Direção visual e catálogo de seções derivados de [REFERENCIAS_VISUAIS](REFERENCIAS_VISUAIS.md): seções com **variações desenhadas**, tipografia de display marcante, alternância de seções claras/escuras, fundos “vivos” (gradiente, grão, grade), cartões com borda fina e vidro opcional, animações sutis e CSS-first.

### B.1 Modelo de tema

```ts
type SiteTheme = {
  preset: 'aurora' | 'papel' | 'sinal' | 'terra' | 'custom'
  mode: 'light' | 'dark'                      // modo base; cada seção pode inverter
  colors: {                                   // tokens no padrão shadcn
    background: string; foreground: string
    primary: string;    primaryForeground: string
    accent: string;     accentForeground: string
    muted: string;      mutedForeground: string
    card: string;       border: string; ring: string
  }
  darkColors?: Partial<SiteTheme['colors']>   // usado em seções com data-theme="dark"
  fonts:  { heading: FontId; body: FontId }   // FontId ∈ lista curada
  radius: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  buttonStyle: 'solid' | 'outline' | 'pill' | 'glow'
  surface: 'flat' | 'bordered' | 'glass'      // aparência padrão de cartões
  spacing: 'compact' | 'comfortable' | 'airy'
  motion: 'none' | 'subtle' | 'expressive'    // intensidade global das animações
}
```
Convertido em `--background`, `--foreground`, `--primary`, …, `--radius`, `--font-heading`, `--font-body`, `--section-space` no `.site-root`. O editor valida contraste ao escolher cores e alerta quando `foreground/background` ou `primaryForeground/primary` ficam abaixo de 4,5:1.

### B.2 Presets iniciais

| Preset | Modo | Fontes (título / texto) | Caráter | Bom para |
|---|---|---|---|---|
| **Aurora** | escuro | Bricolage Grotesque / Geist | fundo quase preto, malha de gradiente azul-esverdeada, vidro, botões *glow* | tecnologia, serviços digitais, cursos |
| **Papel** | claro | Instrument Serif / Inter Tight | marfim, tinta, um acento terracota, bordas finas, muito espaço | consultorias, escritórios, saúde |
| **Sinal** | claro com seções pretas | Archivo (Expanded) / Archivo | branco e preto de alto contraste, acento amarelo-sinal, raio zero | varejo, promoções, eventos |
| **Terra** | claro quente | Fraunces / Manrope | areia, verde-oliva, cantos arredondados, fotos em destaque | alimentação, estética, bem-estar |

Fontes curadas (self-hosted, `woff2`, só as usadas são carregadas): Bricolage Grotesque, Geist, Instrument Serif, Inter Tight, Archivo, Fraunces, Manrope, DM Serif Display, Plus Jakarta Sans, Sora, Playfair Display, Work Sans.

### B.3 Biblioteca de blocos

**Seções** (com variações desenhadas): catálogo completo e prioridades em [REFERENCIAS_VISUAIS §3.2](REFERENCIAS_VISUAIS.md#32-catálogo-de-seções-do-produto-mapeado-a-partir-de-r1) — `hero`, `announcement-bar`, `site-header`, `logo-cloud`, `features` (incl. bento), `stats`, `steps`, `testimonials`, `pricing`, `faq`, `cta`, `gallery`, `video`, `team`, `site-footer`, `comparison`/`timeline`/`map` (P2).

**Elementos** (primitivos):

| Grupo | Elementos | Propriedades principais |
|---|---|---|
| Estrutura | `section`, `columns` (1–4, proporções), `grid`/bento, `spacer`, `divider` | fundo (cor do tema · malha de gradiente · grão · grade/pontos · brilho radial · imagem · vídeo), modo claro/escuro da seção, padding por breakpoint, largura (contida/total), borda com gradiente |
| Texto | `heading` (h1–h4), `text` (rico restrito), `eyebrow`/badge, `list` | conteúdo, nível, tamanho na escala, alinhamento, cor do tema, efeito (gradiente, destaque de palavra, revelação por palavra) |
| Mídia | `image`, `video` (YouTube/Vimeo por ID), `marquee` | mídia da biblioteca, alt obrigatório, proporção, ajuste, moldura (navegador/celular), velocidade/direção do marquee |
| Ação | `button`, `button-group`, `whatsapp-button` | texto, link validado, variante do tema, ícone |
| Conversão | `form` (referencia `form_id`), `countdown` (P2) | formulário, layout, texto do botão |
| Cartão | `card` | superfície (flat/bordered/glass), hover (elevar · spotlight · inclinação) |

Todos os blocos aceitam `animation` (entrada, atraso, duração, sequência) conforme [REFERENCIAS_VISUAIS §4](REFERENCIAS_VISUAIS.md#4-animações-e-transições), limitada pela intensidade global `theme.motion`.

Escala tipográfica pública: `clamp()` fluida em 7 passos (títulos de display chegam a 72–96 px no desktop); o cliente escolhe o passo, não px livres. Margens/paddings em degraus (0, 8, 16, 24, 32, 48, 64, 96, 128, 160 px).

### B.4 Responsividade
Breakpoints do editor e do renderer: `mobile < 640`, `tablet 640–1023`, `desktop ≥ 1024`. Propriedades de layout aceitam override por breakpoint (`props.responsive.mobile.padding`), herdando do maior para o menor. Colunas empilham no mobile por padrão.

### B.5 Acessibilidade obrigatória no público
Um único `h1` por página (o editor avisa), `alt` obrigatório (ou marcado decorativo), contraste validado, foco visível com a cor de acento, rótulos visíveis em formulários, mensagens de erro anunciadas, alvos de toque ≥ 44 px, `prefers-reduced-motion`.
