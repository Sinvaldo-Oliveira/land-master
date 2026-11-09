# Plano de Desenvolvimento

> Versão 0.1 · 2026-11-09 · Status: **aguardando autorização para a Fase 2**

## Regras de execução (válidas em todas as fases)

1. Uma fase por vez; cada fase termina com `npm run verify` verde, checagem manual dos fluxos e relatório de arquivos criados/alterados e pendências.
2. Commit de ponto de recuperação antes de qualquer mudança relevante; branch por fase (`fase-2-fundacao`, …).
3. O projeto `sites/forttimobiliaria` **não é referência** (decisão de 2026-11-09) e nada é escrito nele. Referências visuais: [REFERENCIAS_VISUAIS](REFERENCIAS_VISUAIS.md).
4. Nenhuma operação em serviço externo (criar projeto Supabase, aplicar migração remota, deploy, DNS) sem autorização explícita.
5. Sem dados fictícios apresentados como reais; seeds só de configuração.
6. Dependências novas só com justificativa registrada na ARQUITETURA.

## Visão das fases

| Fase | Entrega | Depende de | Esforço relativo |
|---|---|---|---|
| 0 | Auditoria | — | ✅ concluída |
| 1 | PRD e planejamento | 0 | ✅ concluída (este conjunto de docs) |
| 2 | Fundação da dashboard | aprovação + decisões D1–D4 | M |
| 3 | Banco, contatos e CRM/Kanban | 2 | G |
| 4 | Tema, identidade e Home | 3 (settings/pages), renderer mínimo | M |
| 5 | Construtor de landing pages + publicação | 4 | GG |
| 6 | Formulários e integração com CRM | 3, 5 | M |
| 7 | Dashboard de indicadores e relatórios | 3, 6 | M |
| 8 | Produção Hostinger | todas | M |

(P = pequeno, M = médio, G = grande, GG = muito grande.)

---

## Fase 2 — Fundação da dashboard

**Objetivo:** projeto rodando com login real, layout do admin, rotas protegidas, design system base e esqueleto dos módulos — sem regras de negócio.

| # | Tarefa | Verificação |
|---|---|---|
| 2.1 | `git init`, `.gitignore` (`.env*` exceto `.env.example`, `node_modules`, `dist`, artefatos de teste), commit inicial dos docs | `git status` limpo |
| 2.2 | Scaffold Vite + React + TS em `land-master` (sem sobrescrever `.agents`, `.claude`, `docs`); dependências com versões exatas | `npm ci` reprodutível |
| 2.3 | ESLint (flat + `jsx-a11y`), TS strict, Vitest, Playwright, script `verify` | `npm run verify` |
| 2.4 | Tailwind 4 com tokens `--admin-*`; fontes do admin self-hosted | página de tokens em dev |
| 2.5 | Componentes base: Button, Input, Select, Checkbox, Switch, Dialog, Sheet, Dropdown, Tooltip, Toast, Badge, Skeleton, EmptyState, ErrorState, StatCard | testes de componente + navegação por teclado |
| 2.6 | Router com shell público (placeholder honesto “site em configuração”) e `/admin/*` lazy | build mostra chunks separados |
| 2.7 | Supabase: `supabase init`; migração mínima `profiles` + `user_roles` + helpers + RLS (necessária para o login funcionar com perfil) | `supabase db reset` local + pgTAP |
| 2.8 | Login, logout, recuperação de senha, `AuthGuard`, `RoleGuard`, tela “sem permissão” | E2E: sem sessão → login; perfil errado → bloqueado |
| 2.9 | AdminLayout: sidebar (por perfil, recolhível, gaveta mobile), topbar, “Ver site” | E2E em 1440/768/375 px |
| 2.10 | Páginas vazias dos módulos com EmptyState explicando o que virá | revisão visual |
| 2.11 | `.env.example`, `docs/DESENVOLVIMENTO_LOCAL.md` | outra pessoa sobe o projeto só com o doc |

**Critério de pronto:** login funcional contra Supabase (local ou projeto de dev), `/admin` inacessível sem sessão, bundle público sem código do admin, `verify` verde.

## Fase 3 — Banco, contatos e CRM

- Migrações 0001–0013 do [MODELO_BANCO_DADOS](MODELO_BANCO_DADOS.md) (CRM e base), seed do funil padrão, tipos gerados.
- Testes pgTAP de RLS para admin, gestor, operador e anônimo.
- Contatos: lista (busca, filtros, paginação), cadastro com aviso de duplicidade, detalhe com linha do tempo, conversão em cliente.
- CRM: Kanban com dnd-kit (mouse, toque e teclado), RPC `move_deal`, otimismo com reversão, Sheet de detalhe, atividades, tarefas, ganho/perda com motivo, histórico, filtros.
- Configurações: funis/etapas, motivos de perda, origens; usuários (convite via `invite-user`, perfil, desativar).
- **Pronto quando:** critérios de aceite “cadastrar contatos”, “CRM salva e recupera”, “Kanban muda etapa” e “permissões no backend” passam em E2E + pgTAP.

## Fase 4 — Tema, identidade e Home

- Renderer mínimo (`src/renderer/`) com schema Zod `PageDocument v1` e blocos de seção usados pela Home.
- Identidade da empresa e tema (rascunho → publicar), upload para `site-media`.
- Editor da Home por **seções** (formulário por seção, reordenar, ocultar) com pré-visualização desktop/tablet/mobile.
- Presets de tema (Aurora, Papel, Sinal, Terra) e primeiras variações de seções (hero, cabeçalho, recursos, CTA, rodapé), com miniaturas claras/escuras geradas automaticamente.
- Motor de animação CSS-first (`src/renderer/motion/`) com `prefers-reduced-motion`.
- SEO da Home; Home pública lendo `get_public_site()` com snapshot de fallback.
- **Pronto quando:** editar rascunho não altera o público; publicar altera; Lighthouse mobile ≥ 90 em performance e acessibilidade.

## Fase 5 — Construtor de landing pages

- Editor 3 painéis (lazy), biblioteca de blocos completa (DESIGN_SYSTEM §B.3), seleção, arrastar, duplicar, excluir, desfazer/refazer, overrides responsivos, autosave.
- Migração de `schemaVersion`, validação no `publish_page`.
- Templates: captura de leads e serviços profissionais (P0); promoção, agendamento e produto (P1).
- Gestão: lista, criar de template, duplicar, arquivar, excluir, slug, publicar/despublicar.
- Rota pública `/:slug` (opção A da [ESTRATEGIA_PUBLICACAO](ESTRATEGIA_PUBLICACAO.md)).
- **Pronto quando:** E2E cria página a partir de template, edita, publica e abre deslogado por URL.

## Fase 6 — Formulários e integração

- Construtor de formulários (campos, mapeamento, destino no funil, mensagens, consentimento).
- Bloco `form` no renderer com `submission_key`, honeypot, tempo mínimo.
- Edge Function `submit-form` + RPC `ingest_submission`; Turnstile opcional; rate limit.
- **Pronto quando:** envio público cria contato + oportunidade na etapa configurada; reenvio não duplica; testes de abuso passam; nenhum dado de lead legível por `anon`.

## Fase 7 — Indicadores e relatórios

- RPCs de métricas exatamente como no PRD §5, com testes sobre dados de teste controlados (fixtures só no ambiente de teste).
- Dashboard (cards, gráficos Recharts, últimos leads, próximas tarefas, atalhos) e relatórios com exportação CSV.
- Coleta de eventos (`track`) se a decisão D6 for “sim”.

## Fase 8 — Produção Hostinger

- `.htaccess` completo (HTTPS, HSTS, CSP gerada, cache, compressão, 404 real), `index.php` de SEO, `sitemap.xml`, `robots.txt`.
- Otimização de imagens, orçamento de bundle verificado.
- Projeto Supabase de produção: migrações, funções, secrets, SMTP próprio, cadastro público desativado, primeiro admin.
- `docs/INSTALACAO_NOVO_CLIENTE.md` (roteiro completo de replicação) e checklist de produção executado no domínio real.

---

## Decisões pendentes

| # | Decisão | Proposta | Bloqueia |
|---|---|---|---|
| D1 | Aprovar a arquitetura (ARQUITETURA_TECNICA) e a publicação híbrida (ADR-001) | **Aprovada (2026-11-09)** | — |
| D2 | Ambiente Supabase de desenvolvimento | **Resolvida (2026-11-09):** sem Docker na máquina → projeto de dev na nuvem, a ser criado pelo responsável (roteiro em [DESENVOLVIMENTO_LOCAL §3](DESENVOLVIMENTO_LOCAL.md)) | Login real e pgTAP |
| D3 | Repositório remoto (GitHub privado?) e CI (GitHub Actions para `verify`) | Git **local** por enquanto (branch `fase-2-fundacao`); remoto aguarda o responsável | Push/CI |
| D4 | Nome do produto | Provisório “Painel de Vendas”, trocável em `VITE_APP_NAME` sem mudar código | — |
| D5 | Operador comercial vê leads sem responsável? | Não; gestor/admin distribui | Fase 3 (RLS) |
| D6 | Coleta de visitas (`page_events`) entra na v1? | Sim como P1, desativada por padrão | Fase 7 |
| D7 | CAPTCHA Cloudflare Turnstile (conta gratuita na Cloudflare) | Disponível, desativado por padrão | Fase 6 |
| D8 | Plano Supabase em produção (gratuito pausa após inatividade e tem limites de e-mail) | Plano pago por cliente em produção | Fase 8 |
| D9 | SMTP para convites/recuperação de senha (e-mail Hostinger, Resend, etc.) | E-mail do domínio do cliente | Fase 8 |
| D10 | Confirmar PHP habilitado no plano Hostinger contratado | Verificar no hPanel | Fase 8 (camada SEO) |
| D11 | Qual será o primeiro cliente/instalação (para orientar textos e imagens dos templates)? | Definir antes da Fase 4 | Fase 4 |
| D12 | motionsites.ai está em manutenção (2026-11-09) — sem conteúdo de referência | Seguir com 21st.dev agora; reavaliar antes da Fase 5 ou receber URLs/capturas específicas | Fase 5 |
| D13 | Assinatura do 21st.dev (o plano gratuito limita a 2 cópias/dia) | Não assinar: usar como inspiração e reimplementar | — |

## Riscos do projeto

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Construtor visual crescer além do previsto | Alta | Alto | Lista fechada de blocos; P2 explícito; propriedades em degraus em vez de valores livres |
| Prévia em redes sociais ruim sem PHP | Média | Médio | Camada PHP (Fase 8); fallback B documentado |
| Limites do plano gratuito Supabase (pausa, e-mails) | Alta em dev | Médio | D8/D9 |
| Spam em formulários | Média | Médio | Defesa em camadas da Fase 6 |
| RLS incorreta expondo leads | Baixa | Crítico | pgTAP obrigatório por tabela/perfil; teste “toda tabela tem RLS” |
| Quebra por atualização de dependências | Média | Médio | Versões exatas + lockfile + atualização deliberada |
| TypeScript 7 / React Router 8 com incompatibilidades no ecossistema | Média | Baixo | Começar em TS 6.x; validar RR 8 na Fase 2 com fallback 7.x |
| LGPD (consentimento, retenção, direitos do titular) | Média | Alto | Base legal por submissão, anonimização, política editável; revisão jurídica pelo cliente |
