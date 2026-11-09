# Referências Visuais — Construtor de Landing Pages e Site Público

> Versão 0.1 · 2026-11-09 · Status: **proposta para revisão**
> Substitui o projeto Fortt como referência visual e técnica (decisão do responsável em 2026-11-09 — ver [ARQUITETURA ADR-002](ARQUITETURA_TECNICA.md#12-registro-de-decisões-adr)).

## 1. Referências oficiais

| # | Referência | Uso | Situação em 2026-11-09 |
|---|---|---|---|
| R1 | [21st.dev](https://21st.dev/) | Qualidade e taxonomia de componentes, variações de seções, tokens de tema, padrões de animação | ✅ Lida (homepage e catálogo `/community/components`) |
| R2 | [motionsites.ai](https://motionsites.ai/) | Estilo de landing pages, composição, animações e transições | ⚠️ **Em manutenção** (“MotionSites is getting an upgrade right now”) — nenhum conteúdo de referência disponível. Reavaliar quando voltar ao ar (pendência D12) |

Ambos são **exclusivamente inspiração visual e conceitual**. Nenhum código, imagem ou texto será copiado sem verificação de licença (§6).

## 2. O que é o 21st.dev (fatos observados)

- Catálogo comunitário de componentes **React + TypeScript + Tailwind**, compatíveis com **shadcn/ui** (Vite, Next, Remix, Astro). Anuncia mais de 12.000 componentes.
- Distribuição no formato *registry* do shadcn: o código é **copiado para o repositório** (“own it, change it”), sem pacote de runtime. Os componentes usam os **tokens de design do projeto** e herdam o tema.
- Previews em versão **clara e escura**.
- Autoria comunitária (cada componente tem um autor); acesso gratuito limitado (2 cópias/dia) e assinatura paga para cópias ilimitadas e templates premium.
- **Nenhuma licença formal** encontrada nas páginas lidas; pode variar por autor.

### 2.1 Taxonomia de blocos de marketing do catálogo

Announcements · Backgrounds · Borders · Calls to Action · Clients · Comparisons · Docks · FAQs · Features · Footers · Galleries · Gradients · **Heroes** (a maior categoria) · Images · Maps · Marquees · Navigation Menus · Pricing Sections · Scroll Areas · Shaders · Stats & KPIs · Steppers · Team Sections · Testimonials · Texts · Timelines · Videos.

### 2.2 Tendências visíveis pelos componentes populares
“Liquid glass” (vidro/transparência), *spotlight cards* (brilho que segue o cursor), *scroll stacking cards*, fundos com caminhos/linhas animados, *container scroll animation*, marquees, cenas 3D (Spline), *neon loops*. A tipografia, a paleta e o espaçamento exatos não puderam ser extraídos (renderizados em imagens).

## 3. O que adotamos

### 3.1 Biblioteca orientada a **seções com variações desenhadas**
A maior lição do 21st.dev: o usuário escolhe entre **variações prontas e bem desenhadas** de cada tipo de seção (ex.: 6 heroes diferentes), em vez de montar tudo com primitivos. Isso aproxima o construtor da experiência Canva — resultado bonito em poucos cliques — e mantém a liberdade para ajustes finos.

Painel esquerdo do editor:
1. **Seções** (padrão): categorias → miniaturas das variações (clara/escura conforme o tema).
2. **Elementos**: primitivos (título, texto, imagem, botão, vídeo, espaçador, divisor, colunas, formulário).
3. **Camadas**: árvore da página.

### 3.2 Catálogo de seções do produto (mapeado a partir de R1)

| Categoria R1 | Bloco no produto | Variações iniciais | Prior. |
|---|---|---|---|
| Heroes | `hero` | centralizado · dividido com imagem · com formulário ao lado · vídeo de fundo · com mockup/print de produto · com imagem em perspectiva ao rolar | P0 (3) / P1 (3) |
| Announcements | `announcement-bar` | faixa fixa com link · com contagem regressiva (P2) | P1 |
| Navigation Menus | `site-header` | logo + links + CTA · transparente sobre o hero · *pill* flutuante com vidro | P0 |
| Clients | `logo-cloud` | grade · marquee contínuo | P0 |
| Features | `features` | grade de ícones · **bento** · alternado imagem/texto · lista com destaque | P0 (2) / P1 (2) |
| Stats & KPIs | `stats` | números grandes com contagem animada (valores informados pelo cliente) | P0 |
| Steppers | `steps` | “como funciona” em 3–5 passos · linha do tempo horizontal | P0 |
| Testimonials | `testimonials` | grade · carrossel · marquee em duas linhas | P0 (2) / P1 (1) |
| Pricing Sections | `pricing` | 2–4 planos · com alternador mensal/anual | P1 |
| Comparisons | `comparison` | “nós × outros” · tabela de recursos | P2 |
| FAQs | `faq` | acordeão · duas colunas | P0 |
| Calls to Action | `cta` | faixa · cartão com fundo gradiente · com formulário curto | P0 |
| Galleries / Images | `gallery` | grade · *masonry* · antes/depois (P2) | P1 |
| Videos | `video` | incorporado (YouTube/Vimeo) · com capa e botão play | P0 |
| Team Sections | `team` | grade com foto e cargo | P1 |
| Timelines | `timeline` | vertical | P2 |
| Maps | `map` | incorporado (Google Maps/OSM por endereço) | P2 |
| Footers | `site-footer` | colunas · minimalista · com CTA grande | P0 |
| Texts | efeito em `heading` | gradiente no texto · palavra destacada · revelação por palavra | P0 |
| Backgrounds / Gradients / Borders | propriedades de `section` | malha de gradiente · grão · grade/pontos · brilho radial · borda com gradiente | P0 |
| Shaders | fundo `shader` | gradiente animado em WebGL, carregado sob demanda | P2 |

Cada variação é um **preset de `props` + `style`** de um mesmo bloco (não um componente separado), definido em `src/renderer/blocks/<tipo>/variants.ts` com miniatura gerada automaticamente (Playwright) nas versões clara e escura.

### 3.3 Tema por tokens no padrão shadcn
Como os componentes do R1 “herdam o tema” por tokens shadcn, o **tema público usa a mesma nomenclatura** (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--ring`, `--radius`, `--card`), com escopo no contêiner `.site-root`. Vantagens:
- Padrões do ecossistema shadcn/21st.dev se adaptam ao nosso tema sem retrabalho.
- Modo claro/escuro por seção (`data-theme="dark"` em uma seção), como nos previews do R1.
- O admin usa tokens próprios em outro escopo, sem colisão (ver [DESIGN_SYSTEM](DESIGN_SYSTEM.md)).

### 3.4 Linguagem visual-alvo das landing pages
- Tipografia de display grande e com personalidade, com pesos e espaçamento negativo nos títulos; texto confortável (16–18 px, altura de linha 1,6).
- Contraste forte entre seções claras e escuras, com fundos “vivos” (malha de gradiente, grão, grade sutil) em vez de cor chapada.
- Cartões com borda de 1 px, raio generoso, sombras suaves e, quando escolhido, vidro (`backdrop-filter`) com fallback opaco.
- Bento grids para recursos; marquees para logotipos e depoimentos.
- Espaço negativo generoso (seções de 96–160 px no desktop).
- **Nada de gradiente roxo genérico como padrão**; os presets de tema (DESIGN_SYSTEM §B.2) têm paletas distintas.

## 4. Animações e transições

### 4.1 Modelo no documento da página
Todo bloco aceita:
```ts
animation?: {
  entrance: 'none' | 'fade' | 'fade-up' | 'fade-down' | 'slide-left' | 'slide-right' | 'scale-in' | 'blur-in'
  delayMs: 0 | 100 | 200 | 300 | 500 | 800
  durationMs: 300 | 500 | 700 | 1000
  stagger?: boolean          // filhos em sequência (listas, cards, palavras do título)
  once: boolean              // padrão true
}
```
Efeitos especiais por bloco: `marquee` (velocidade, direção, pausa no hover), `stats` (contagem), `heading` (revelação por palavra, gradiente animado), `card` (inclinação/spotlight no hover), `hero` (parallax suave da imagem), `cards` (empilhamento ao rolar — P1).

### 4.2 Implementação (performance primeiro)

| Técnica | Onde | Custo no bundle público |
|---|---|---|
| CSS keyframes + transições controladas por classes | entradas, hover, marquee, gradiente animado | ~0 kB |
| `IntersectionObserver` único compartilhado | disparar entradas e contagens ao entrar na tela | < 1 kB |
| CSS `animation-timeline: view()` com fallback | parallax e efeitos ligados ao scroll, onde houver suporte | 0 kB |
| `motion` (v14.x) via import dinâmico **por bloco** | só variações que exigem física/layout (empilhamento ao rolar, carrossel com arrasto) e apenas nas páginas que as usam | carregado sob demanda |
| WebGL/shaders, Spline 3D, Lottie, cursores personalizados | **fora da v1** (P2, sob demanda) | — |

Regras:
- Animar só `transform`, `opacity` e `filter`; nunca propriedades de layout.
- Conteúdo visível sem JavaScript (estado inicial não pode esconder conteúdo para quem não executa JS ou para robôs de busca).
- `prefers-reduced-motion: reduce` → entradas viram `none`, marquees param, parallax desliga.
- Nada anima acima da dobra antes do LCP; o hero usa no máximo `fade` curto.
- O editor mostra as animações na pré-visualização e tem o botão “reproduzir animações”.

## 5. Personalização no editor (inspirada no modelo “copie e ajuste” do R1)

| Nível | O que o usuário faz | Exemplo |
|---|---|---|
| 1. Escolher variação | Troca a variação mantendo o conteúdo | hero “centralizado” → “dividido com imagem” |
| 2. Tema | Cores, fontes, raio, estilo dos botões, claro/escuro por seção | seção de depoimentos em modo escuro |
| 3. Estilo do bloco | Fundo, espaçamento em degraus, alinhamento, largura, bordas, sombra, vidro | fundo com malha de gradiente |
| 4. Animação | Entrada, atraso, sequência | cards com `fade-up` em sequência |
| 5. Responsivo | Ajustes por desktop/tablet/mobile | ocultar imagem no mobile |
| 6. Salvar como bloco reutilizável | Guarda a seção personalizada na biblioteca | P2 |

## 6. Política de uso das referências

1. **Inspiração, não cópia.** Reimplementamos os padrões com código próprio sobre o nosso schema de blocos.
2. Se algum componente do 21st.dev for aproveitado como base de código: verificar a licença na página do autor, registrar origem, autor e licença em `docs/TERCEIROS.md` e adaptar ao schema/tokens. Sem licença explícita → **não usar**.
3. Nenhum texto, imagem, logotipo ou marca dos sites de referência entra no produto ou nos templates.
4. Templates premium/pagos das referências não são usados.
5. Imagens dos templates: fotos de bancos com licença comercial (ex.: Unsplash/Pexels, conferindo os termos) ou ilustrações próprias, documentadas.

## 7. Pendências
- **D12:** motionsites.ai indisponível. Opções: (a) reavaliar quando voltar; (b) o responsável indica URLs específicas ou capturas de tela que exemplifiquem o que agrada; (c) seguir só com R1 por enquanto. Proposta: (c) agora + (a) antes da Fase 5.
- O briefing de referências visuais recebido terminou em “Composição” — os itens após esse ponto não foram recebidos.
