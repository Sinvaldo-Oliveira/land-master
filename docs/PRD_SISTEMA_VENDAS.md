# PRD — Sistema de Gestão de Vendas e Landing Pages

> Versão 0.1 · 2026-11-09 · Status: **rascunho para revisão**
> Documentos relacionados: [ARQUITETURA_TECNICA](ARQUITETURA_TECNICA.md) · [MODELO_BANCO_DADOS](MODELO_BANCO_DADOS.md) · [ESTRATEGIA_PUBLICACAO](ESTRATEGIA_PUBLICACAO.md) · [DESIGN_SYSTEM](DESIGN_SYSTEM.md) · [REFERENCIAS_VISUAIS](REFERENCIAS_VISUAIS.md) · [PLANO_DESENVOLVIMENTO](PLANO_DESENVOLVIMENTO.md)

---

## 1. Problema e proposta

Pequenos negócios costumam ter site, landing pages, formulários e controle de clientes espalhados entre ferramentas diferentes (construtor de sites, planilha, WhatsApp, CRM avulso). O resultado é lead perdido, retrabalho e falta de visão do funil.

O produto reúne, em **uma instalação exclusiva por empresa**:

1. Site institucional (Home) editável pela dashboard.
2. Construtor visual de landing pages, sem código.
3. Formulários públicos que alimentam automaticamente o CRM.
4. CRM com funil Kanban.
5. Indicadores calculados sobre dados reais.

## 2. Modelo de entrega

| Item | Decisão |
|---|---|
| Tipo | Instalação individual (single-tenant). **Não é SaaS.** |
| Código | Base única reutilizada; cada cliente recebe uma cópia configurada. |
| Dados | Um projeto Supabase por cliente (banco, Auth e Storage próprios). |
| Hospedagem | Hostinger compartilhada, arquivos estáticos de `dist/`. |
| Domínio | Próprio de cada cliente. |
| Fora de escopo | Cobrança recorrente, assinatura, painel global multiempresa. |

## 3. Personas

| Persona | Perfil | Objetivo principal |
|---|---|---|
| **Administrador** (dono do negócio) | Pouca familiaridade técnica | Publicar páginas, ver resultados, configurar o sistema. |
| **Gestor** | Coordena vendas | Acompanhar funil, distribuir oportunidades, relatórios. |
| **Operador comercial** | Atende leads | Trabalhar as próprias oportunidades e tarefas. |
| **Visitante** | Público do site | Conhecer a empresa e enviar contato. |
| **Implantador** (nós) | Técnico | Instalar e configurar uma nova empresa em poucas horas. |

## 4. Escopo por módulo

Prioridades: **P0** = obrigatório para o primeiro cliente em produção; **P1** = desejável na primeira entrega; **P2** = evolução.

### M01 — Dashboard principal
| Req. | Descrição | Prior. |
|---|---|---|
| D-01 | Cards de indicadores (ver §5) filtráveis por período (7d, 30d, 90d, mês atual, personalizado). | P0 |
| D-02 | Gráfico de captação de leads por dia/semana. | P0 |
| D-03 | Gráfico de oportunidades por etapa (quantidade e valor). | P0 |
| D-04 | Últimos leads (10) e próximas tarefas do usuário. | P0 |
| D-05 | Atalhos: novo contato, nova oportunidade, criar landing page, editar Home, abrir CRM. | P0 |
| D-06 | Estado vazio explicativo quando não houver dados — **nunca números fictícios**. | P0 |

### M02 — Contatos e clientes
| Req. | Descrição | Prior. |
|---|---|---|
| C-01 | CRUD de contato: nome, e-mail, telefone, WhatsApp, empresa, observações, origem, estágio, timestamps. | P0 |
| C-02 | Estágio de ciclo de vida: Lead → Em negociação → Cliente (mais Inativo). Conversão sem duplicar registro; venda ganha converte automaticamente em Cliente. | P0 |
| C-03 | Busca (nome, e-mail, telefone) e filtros (estágio, origem, responsável, período). | P0 |
| C-04 | Detecção de duplicidade por e-mail normalizado e telefone normalizado, com aviso no cadastro. | P0 |
| C-05 | Linha do tempo: atividades, mudanças de etapa, submissões de formulário. | P0 |
| C-06 | Oportunidades vinculadas ao contato. | P0 |
| C-07 | LGPD: registro de base legal/consentimento, exportação dos dados de um titular, anonimização sob solicitação. | P1 |
| C-08 | Mesclar contatos duplicados. | P2 |

### M03 — CRM e Kanban
| Req. | Descrição | Prior. |
|---|---|---|
| K-01 | Funis e etapas configuráveis (nome, cor, ordem, probabilidade, flag de “ganho”). Funil padrão criado na instalação. | P0 |
| K-02 | Oportunidade: título, contato, valor estimado, responsável, próxima ação + data, status (`aberta`, `ganha`, `perdida`). | P0 |
| K-03 | Arrastar cards entre etapas e reordenar na etapa (dnd-kit), acessível por teclado. | P0 |
| K-04 | Persistência imediata via RPC transacional; atualização otimista com **reversão visual** e toast em caso de falha. | P0 |
| K-05 | “Perdida” é um status (não coluna) com motivo obrigatório; visualizável por filtro. | P0 |
| K-06 | Histórico de mudanças de etapa/valor/responsável (automático, via banco). | P0 |
| K-07 | Atividades (nota, ligação, WhatsApp, e-mail, reunião) e tarefas com prazo. | P0 |
| K-08 | Filtros por responsável, etapa, período e status. | P0 |
| K-09 | Visão em lista (tabela) além do Kanban. | P1 |

### M04 — Gerenciamento da Home
| Req. | Descrição | Prior. |
|---|---|---|
| H-01 | Identidade da empresa: nome, logotipo, favicon, cores, tipografia, contatos, endereço, redes sociais. | P0 |
| H-02 | Home composta por **seções pré-definidas** (hero, destaques/cards, sobre, benefícios, CTA, depoimentos, FAQ, contato, rodapé) com conteúdo editável, ordem e visibilidade. | P0 |
| H-03 | SEO: título, meta description, imagem OG, canônica, `noindex`. | P0 |
| H-04 | Rascunho × publicada: editar não altera o site público até “Publicar”. | P0 |
| H-05 | Pré-visualização do rascunho em desktop/tablet/mobile. | P0 |
| H-06 | Histórico de versões publicadas e restauração. | P1 |

> Não existe Home prévia a preservar: `land-master` não contém landing page e o projeto Fortt foi descartado como referência (2026-11-09). A Home é construída com o **mesmo catálogo de seções e o mesmo renderizador** do construtor de landing pages, seguindo as referências visuais em [REFERENCIAS_VISUAIS](REFERENCIAS_VISUAIS.md) (21st.dev e motionsites.ai).

### M05 — Construtor de landing pages
| Req. | Descrição | Prior. |
|---|---|---|
| L-01 | Editor com 3 painéis (biblioteca, canvas, propriedades) + barra superior (nome, status, salvar, pré-visualizar, desktop/tablet/mobile, publicar). | P0 |
| L-02 | Biblioteca de **seções com variações desenhadas** (hero, cabeçalho, logos, recursos/bento, números, passos, depoimentos, FAQ, CTA, vídeo, rodapé; preços, galeria, equipe em P1) + elementos primitivos (seção, colunas, título, texto, imagem, botão, formulário, card, marquee, espaçador, divisor, vídeo YouTube/Vimeo). Catálogo em [REFERENCIAS_VISUAIS §3.2](REFERENCIAS_VISUAIS.md). | P0 |
| L-03 | Adicionar, arrastar, reordenar, selecionar, duplicar, excluir; desfazer/refazer (≥ 50 passos). | P0 |
| L-04 | Propriedades: conteúdo, cor, fonte, tamanho, alinhamento, margem, padding, largura, altura, borda, fundo, link; overrides por breakpoint. | P0 |
| L-05 | Documento salvo como **JSON tipado e versionado** (`schemaVersion`), validado com Zod no cliente e no banco. Sem HTML arbitrário, sem `eval`, sem scripts customizados. | P0 |
| L-06 | 5 templates: captura de leads, serviços profissionais, promoção, agendamento, produto. | P0 (2) / P1 (3) |
| L-07 | Gestão: criar, editar, duplicar, arquivar, excluir (confirmação), pré-visualizar, publicar, despublicar, slug amigável, leads por página. | P0 |
| L-08 | Autosave de rascunho a cada alteração (debounce) com indicador de estado. | P1 |
| L-09 | Contador, componentes reutilizáveis (“blocos salvos”). | P2 |
| L-10 | Animações configuráveis por bloco (entrada, atraso, duração, sequência) e intensidade global do tema; respeitam `prefers-reduced-motion` e não pesam no carregamento. | P0 |
| L-11 | Tema com modo claro/escuro por seção, fundos especiais (malha de gradiente, grão, grade, brilho) e cartões com vidro opcional. | P0 |

### M06 — Formulários e captação
| Req. | Descrição | Prior. |
|---|---|---|
| F-01 | Campos: nome, e-mail, telefone, WhatsApp, texto, número, seleção, checkbox, consentimento; obrigatório/opcional. | P0 |
| F-02 | Configuração: nome, página vinculada, funil e etapa de destino, criar oportunidade (sim/não), mensagem de sucesso, redirecionamento, rótulo de origem. | P0 |
| F-03 | Submissão por **Edge Function** (`submit-form`): validação no servidor, rate limit, honeypot, tempo mínimo de preenchimento, CAPTCHA opcional (Turnstile), idempotência. | P0 |
| F-04 | Fluxo: valida → registra submissão → identifica página/UTM → localiza ou cria contato → cria oportunidade (se configurado) na etapa inicial → registra no histórico. | P0 |
| F-05 | Reenvio acidental não duplica oportunidade (chave de idempotência + janela de deduplicação por contato/formulário). | P0 |
| F-06 | Notificação por e-mail/WhatsApp ao responsável. | P2 |

### M07 — Relatórios
| Req. | Descrição | Prior. |
|---|---|---|
| R-01 | Leads por período, por landing page e por origem. | P0 |
| R-02 | Oportunidades por etapa; vendas concluídas; valor vendido. | P0 |
| R-03 | Taxa de conversão lead → cliente. | P0 |
| R-04 | Desempenho das páginas (visualizações, envios, taxa) — **somente com coleta de eventos ativa** (ver §5.3). | P1 |
| R-05 | Exportação CSV. | P1 |

### M08 — Configurações
| Req. | Descrição | Prior. |
|---|---|---|
| S-01 | Dados da empresa e identidade visual (compartilhado com H-01). | P0 |
| S-02 | Usuários: convidar por e-mail, atribuir perfil, desativar. **Sem cadastro público.** | P0 |
| S-03 | Funis e etapas; motivos de perda; origens de lead. | P0 |
| S-04 | Preferências (moeda, fuso, formato de data), integrações futuras (placeholders desativados). | P1 |

## 5. Definição das métricas

Regras gerais: todas as métricas respeitam o **período selecionado** no fuso configurado da empresa (`business_settings.timezone`, padrão `America/Sao_Paulo`), são calculadas no banco (views/RPC) e respeitam RLS — o operador vê apenas o que lhe é permitido.

| Métrica | Fonte | Regra |
|---|---|---|
| Total de contatos | `contacts` | `count(*)` onde `deleted_at is null` (não depende do período). |
| Novos leads no período | `contacts` | Contatos com `created_at` no período. |
| Oportunidades em aberto | `deals` | `status = 'open'` (snapshot atual). |
| Vendas concluídas | `deals` | `status = 'won'` e `closed_at` no período. |
| Valor vendido | `deals` | `sum(amount)` das vendas concluídas no período. |
| Valor estimado do funil | `deals` | `sum(amount)` de `status='open'`; versão ponderada: `sum(amount × stage.probability)`. Ambas rotuladas. |
| Landing pages publicadas | `pages` | `kind='landing'` e `status='published'`. |
| Leads por landing page | `form_submissions` | Submissões válidas agrupadas por `page_id` no período. |
| Taxa de conversão lead→cliente | `contacts` | Contatos criados no período que hoje estão em `lifecycle='customer'` ÷ contatos criados no período. Rotulada como “coorte do período”. |
| Atividades pendentes | `tasks` | `completed_at is null` e `due_at ≤ fim do período`; atrasadas destacadas. |
| Visualizações de página | `page_events` | Somente se a coleta estiver ativa; antes disso a UI mostra “coleta não ativada”. |

### 5.3 Coleta de eventos de página
- Evento `page_view` enviado por `navigator.sendBeacon` para a Edge Function `track` (sem cookies, sem identificador persistente, IP descartado após hash diário com sal).
- Ativável em Configurações; texto do aviso de privacidade gerado no rodapé.
- **Visitas nunca são inferidas a partir de leads.** Sem coleta → métrica indisponível.

## 6. Requisitos não funcionais

| Área | Requisito |
|---|---|
| Hospedagem | `npm run build` → `dist/` estático; funciona em Hostinger compartilhada sem Node residente. |
| Performance | Home pública: JS inicial ≤ 120 KB gzip, LCP < 2,5 s em 4G. Admin e editor carregados sob demanda. |
| Acessibilidade | WCAG 2.2 AA nas páginas públicas e na dashboard (foco visível, teclado no Kanban, contraste). |
| Segurança | RLS em todas as tabelas expostas; autorização no banco; `service_role` só em Edge Functions; CSP restritiva. |
| LGPD | Base legal registrada por submissão, minimização de dados, exportação/anonimização do titular, política de privacidade editável. |
| Responsividade | Desktop, tablet e celular (320 px+). |
| Replicabilidade | Nova instalação por roteiro documentado: criar projeto Supabase → `supabase db push` → deploy de funções → `.env` → build → upload. |
| Idioma | pt-BR na interface; código e banco em inglês. |

## 7. Critérios de aceite do produto

Reproduzidos do briefing e mapeados para verificação:

| Critério | Como verificar |
|---|---|
| Home pública funciona | E2E Playwright em `dist/` servido localmente + teste manual na Hostinger. |
| `/admin` exige autenticação | Teste E2E sem sessão → redireciona para login. |
| Cadastrar contatos | E2E CRUD. |
| CRM salva e recupera oportunidades; Kanban muda etapa | E2E drag + recarregar página. |
| Editar conteúdo da Home | Editar rascunho → público inalterado → publicar → público alterado. |
| Criar e publicar landing page acessível por URL | E2E: template → publicar → abrir `/{slug}` deslogado. |
| Formulário público seguro; lead aparece no CRM | Teste de função + E2E; testes de abuso (rate limit, honeypot, payload inválido). |
| Permissões no backend | Testes SQL de RLS (pgTAP) por perfil. |
| Gera `dist/` e roda na Hostinger | Checklist de produção (Fase 8). |
| Banco independente por instalação | Roteiro de instalação executado do zero em um projeto Supabase novo. |
| Documentação permite replicar | Implantação de uma segunda instalação seguindo só os docs. |

## 8. Fora de escopo (v1)

Cobrança/assinatura; multiempresa; app mobile nativo; e-mail marketing; chat ao vivo; integração oficial com API do WhatsApp; domínio por landing page; A/B testing; scripts personalizados em páginas; editor de HTML/CSS livre.

## 9. Decisões pendentes (dependem do cliente/negócio)

Listadas em [PLANO_DESENVOLVIMENTO §Decisões pendentes](PLANO_DESENVOLVIMENTO.md#decisões-pendentes).
