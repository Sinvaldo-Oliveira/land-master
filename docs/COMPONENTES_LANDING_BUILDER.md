# Componentes — Landing Page Builder

> 2026-11-11 · Status: **proposta**. Catálogo dos blocos, de onde vêm e em que etapa entram.
> Contrato de cada bloco: [ARQUITETURA §3 e §4](ARQUITETURA_LANDING_BUILDER.md).

## 1. Contrato de um bloco

Todo bloco declara os dez itens exigidos pelo PRD §9:

| # | Item | Onde fica |
|---|---|---|
| 1 | ID estável | `block.id`, gerado na criação e preservado ao mover |
| 2 | Tipo | `block.type`, de uma lista fechada |
| 3 | Versão do esquema | `block.v`, com migração por tipo |
| 4 | Propriedades validadas | esquema Zod do tipo |
| 5 | Valores padrão | `defaults()` do tipo |
| 6 | Renderizador | `src/renderer/blocks/` |
| 7 | Propriedades editáveis | lista de campos (`FieldDef`) |
| 8 | Regras de responsividade | quais tokens aceitam override por dispositivo |
| 9 | Restrições de filhos | `accepts` e `maxChildren` |
| 10 | Miniatura | desenho simples no painel de blocos |

## 2. Hierarquia permitida

```text
Página
└─ Seção  (ou uma seção completa)
   └─ Colunas | Grade | elementos
      └─ Coluna
         └─ elementos (texto, mídia, conversão)
```

Regras fixas: seção só na raiz; seção completa não tem filhos; coluna só dentro de Colunas ou Grade; botão, imagem e formulário nunca têm filhos; nenhum bloco entra dentro de si mesmo. Profundidade máxima: 4.

## 3. Catálogo

**Origem:** *existe* = já implementado como seção da Home, reaproveitado sem reescrever · *novo* = a construir.

### Seções completas

| Bloco | Origem | Etapa |
|---|---|---|
| Cabeçalho | existe (`site-header`) | 2 |
| Hero | existe (`hero`) | 2 |
| Sobre a empresa | existe (`about`) | 2 |
| Serviços / Benefícios | existe (`features`) | 2 |
| Como trabalhamos | existe (`steps`) | 2 |
| FAQ | existe (`faq`) | 2 |
| CTA final | existe (`cta`) | 2 |
| Contato | existe (`contact`) | 2 |
| Rodapé | existe (`site-footer`) | 2 |
| Cartão de imagem 3D, Hero interativo, Carrossel de vídeos, Vídeo de vendas | existem | 2 |
| Depoimentos | novo | 5 |
| Preços | novo | 5 |
| Produtos | novo | 5 |

### Estrutura

| Bloco | Filhos aceitos | Etapa |
|---|---|---|
| Seção | Colunas, Grade e elementos | 2 |
| Colunas (1 a 4, com proporções) | Coluna | 4 |
| Grade | Coluna | 4 |
| Espaçador | — | 2 |
| Divisor | — | 2 |

"Container" do PRD não vira um bloco separado: a largura contida ou total é uma propriedade da Seção. Um bloco a menos para o usuário entender.

### Texto

| Bloco | Observação | Etapa |
|---|---|---|
| Título (h1 a h4) | o editor avisa se houver mais de um `h1` | 2 |
| Subtítulo / Parágrafo | texto simples; negrito, itálico e link em estrutura JSON, nunca HTML | 2 |
| Lista | com ou sem ícone | 4 |
| Texto de destaque (selo) | | 4 |

### Mídia

| Bloco | Observação | Etapa |
|---|---|---|
| Imagem | da biblioteca; `alt` obrigatório ou "decorativa" | 2 |
| Galeria | grade de imagens | 5 |
| Vídeo incorporado | YouTube por ID, player sem cookies, só carrega ao clicar | 4 |
| Ícone | da lista fechada de ícones | 4 |

### Conversão

| Bloco | Observação | Etapa |
|---|---|---|
| Botão CTA | link validado por `safeHref` | 2 |
| Botão WhatsApp | número + mensagem; monta `https://wa.me/…` | 4 |
| Formulário | referencia um formulário do módulo Formulários | 8 |
| Cartão de oferta | | 5 |
| Lista de benefícios | | 4 |

## 4. Links

Um único tipo de campo "Link", com seis modos: URL externa (`https`), página interna, âncora da própria página, WhatsApp, telefone e e-mail. O valor é normalizado ao salvar e passa por `safeHref` ao desenhar. `javascript:`, `data:` e similares são recusados nos dois pontos.

## 5. Templates iniciais (Etapa 5)

| Template | Categoria | Prioridade |
|---|---|---|
| Captura de leads | Captura de leads | P0 |
| Serviços profissionais | Serviços profissionais | P0 |
| Clínica ou consultório | Clínicas e consultórios | P0 |
| Comércio local | Comércio local | P1 |
| Oferta / promoção | Ofertas e promoções | P1 |
| Agendamento | Agendamento | P1 |
| Produto | Produtos | P1 |

"Eventos" fica como categoria vazia até existir um template. Cada template é um documento v2 no repositório; ao usar, o sistema grava uma **cópia** na página, com IDs novos. O original nunca é alterado.
