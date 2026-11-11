# Design System — Landing Page Builder

> 2026-11-11 · Status: **proposta**. Estende o [DESIGN_SYSTEM](DESIGN_SYSTEM.md): Parte A (admin, direção "Livro-caixa") para as telas do módulo e Parte B (tema do site) para o que o visitante vê. Este documento só registra o que é **específico** do builder.

## 1. Duas camadas visuais, nunca misturadas

| Camada | Tokens | Onde aparece |
|---|---|---|
| Interface do editor | `--color-admin-*`, fontes do admin | Lista de páginas, barra superior, painéis, camadas |
| Página em construção | `--site-*`, fontes do tema | Só dentro do canvas (iframe) e no site público |

O canvas é um iframe justamente para o estilo do admin não vazar para a página, e vice-versa.

## 2. Tela "Minhas landing pages"

- `PageHeader` com título, subtítulo e o botão principal **Criar landing page**.
- Linha de indicadores com `StatCard`: total, publicadas, em rascunho e leads captados. "Conversão" só aparece quando houver coleta de visitas; sem dado real, o cartão não é exibido (regra do projeto: nada de número fictício).
- Ferramentas: busca por nome, filtro de status, ordenação por data e alternância cartões/lista (preferência lembrada no navegador).
- Cartão: miniatura (ou um desenho neutro com as iniciais, enquanto não houver captura), nome, `/lp/slug`, selo de status, última edição, leads, botão **Editar** e menu de ações.
- Selos: Rascunho (neutro), Publicada (sucesso), Publicada com alterações (aviso), Despublicada (neutro), Arquivada (apagado).
- Ações destrutivas (excluir, despublicar, trocar slug de página publicada) pedem confirmação em diálogo, dizendo o que acontece com o endereço e com os leads.
- Estado vazio com `EmptyState` e os dois caminhos: começar do zero ou escolher um modelo.

## 3. Editor

| Região | Medida | Regras |
|---|---|---|
| Barra superior | 56 px | Estado do salvamento sempre visível, em texto ("Salvo às 14:32"), nunca só por cor. |
| Painel esquerdo | 280 px | Abas **Blocos** (busca + categorias + miniaturas) e **Camadas** (árvore). |
| Canvas | flexível | Fundo neutro; página centralizada na largura do dispositivo, em escala quando não couber. |
| Painel direito | 320 px | Abas Conteúdo, Estilo, Responsivo e Animação. Sem seleção, mostra as configurações da página (nome, slug, SEO, tema). |

**Seleção no canvas**

- Passar o mouse: contorno tracejado de 1 px. Selecionado: contorno sólido de 2 px na cor de acento do admin, com etiqueta do tipo do bloco.
- Barra flutuante do bloco: subir, descer, duplicar, excluir e "inserir abaixo".
- Entre seções, uma linha com **+** para inserir naquele ponto.
- Ao arrastar: linha de inserção de 2 px na posição válida; posição inválida não mostra linha e o cursor indica bloqueio.

**Painel de propriedades**

- Cada controle edita **um** token (ver [ARQUITETURA §5](ARQUITETURA_LANDING_BUILDER.md)). Não há campo de px livre nem de classe CSS.
- Espaçamentos por controle de degraus; cores pelo `ColorField` existente, com atalhos para as cores do tema.
- Na aba Responsivo, um valor herdado aparece esmaecido com a origem ("herdado do desktop"); o valor próprio do dispositivo tem um botão para voltar a herdar.
- Avisos de contraste e de acessibilidade aparecem junto do campo, como já acontece no fundo e no texto das seções da Home.

**Teclado**

`Ctrl+Z` / `Ctrl+Shift+Z` desfazer e refazer · `Ctrl+S` salvar · `Ctrl+D` duplicar · `Del` excluir · setas navegam na árvore de camadas · `Esc` limpa a seleção. Tudo o que se faz arrastando também se faz por botão ou teclado.

## 4. Regras para os blocos e templates

- Biblioteca **própria**. 21st.dev, MotionSites e Canva são referência de acabamento e de experiência; nada de código, imagem ou identidade copiados (ver [REFERENCIAS_VISUAIS](REFERENCIAS_VISUAIS.md)).
- Todo bloco herda cores, fontes e raio do tema da página. Sobrescrever é opcional e local.
- Templates sem dados inventados: nada de depoimento, número ou cliente fictício. Textos são marcadores claros ("Descreva seu serviço em uma frase") e as imagens são desenhos neutros do próprio sistema.
- Responsividade embutida: colunas empilham no celular por padrão; alvos de toque ≥ 44 px; tipografia fluida.
- Acessibilidade obrigatória: um `h1` por página (o editor avisa), `alt` obrigatório ou imagem marcada como decorativa, rótulos visíveis nos formulários, foco visível e `prefers-reduced-motion` respeitado.

## 5. Animações

Presets: nenhuma, fade in, slide up, slide left, slide right e scale in. Duração de 200 a 1200 ms, atraso de 0 a 800 ms, distância em três níveis. Só `opacity` e `transform` (sem mudança de layout), ativadas ao entrar na tela. A intensidade global do tema (`theme.motion`) pode desligar todas de uma vez.
