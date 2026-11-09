# Modelo de Banco de Dados — Supabase PostgreSQL

> Versão 0.1 · 2026-11-09 · Status: **proposta para revisão**. Nenhuma migração foi criada ou executada.

## 1. Princípios

| Regra | Aplicação |
|---|---|
| Single-tenant | **Sem `tenant_id`.** Um banco por empresa. Isolamento entre usuários por perfil/propriedade via RLS. |
| Identificadores | `uuid default gen_random_uuid()` nas entidades (expostas em URLs/API; volume por cliente é pequeno, a fragmentação de UUIDv4 é irrelevante). Se o Postgres do projeto for ≥ 18, usar `uuidv7()` nativo. `bigint generated always as identity` nas tabelas de alto volume e uso interno (`page_events`, `audit_logs`). |
| Nomes | `snake_case`, minúsculas, inglês, tabelas no plural. |
| Tempo | `timestamptz` sempre; `created_at default now()`, `updated_at` mantido por gatilho. |
| Dinheiro | `numeric(14,2)` + `currency char(3) default 'BRL'`. |
| Enums | Tipos `enum` para estados estáveis; tabelas de domínio para listas editáveis (origens, motivos de perda). |
| FKs | Toda FK tem índice. `on delete` explícito em todas. |
| Exclusão | Soft delete (`deleted_at`) em contatos e oportunidades; anonimização LGPD separada. Hard delete só em páginas/formulários (com confirmação) e por admin. |
| RLS | Ativada em todas as tabelas de `public` (teste automático garante). **`FORCE` não é usado**: as funções `security definer` de perfil rodam como dono da tabela e entrariam em recursão nas políticas; o dono só é usado por migrações e por essas funções. Funções em políticas envolvidas por `(select …)`. Colunas usadas em políticas indexadas. Privilégios por coluna (`grant update (col)`) restringem o que `authenticated` pode alterar. |
| Funções privilegiadas | `security definer`, `set search_path = ''`, nomes qualificados, `revoke execute … from public` e grant explícito. |
| Migrações | SQL versionado em `supabase/migrations/`, reproduzível do zero (`supabase db reset`). Nunca editar migração já aplicada em produção. |

## 2. Diagrama (simplificado)

```
auth.users 1─1 profiles 1─1 user_roles
                  │ owner/assignee/created_by
                  ▼
lead_sources 1─* contacts 1─* deals *─1 pipeline_stages *─1 pipelines
                  │   │        │ 1─* deal_events
                  │   │        └─1 lost_reasons
                  │   ├─* activities (contact_id, deal_id?)
                  │   └─* tasks      (contact_id?, deal_id?)
                  │
                  └─* form_submissions *─1 forms 1─* form_fields
                              │               └─? pages
                              └─? pages 1─* page_versions
                                        └─? page_templates

business_settings (linha única) · media_assets · page_events · audit_logs · rate_limit_hits
```

## 3. Tipos enumerados

```sql
create type public.app_role        as enum ('admin', 'manager', 'sales');
create type public.contact_lifecycle as enum ('lead', 'prospect', 'customer', 'inactive');
create type public.deal_status     as enum ('open', 'won', 'lost');
create type public.activity_type   as enum ('note', 'call', 'whatsapp', 'email', 'meeting', 'form_submission', 'system');
create type public.page_kind       as enum ('home', 'landing');
create type public.page_status     as enum ('draft', 'published', 'unpublished', 'archived');
create type public.form_field_type as enum ('name', 'email', 'phone', 'whatsapp', 'text', 'textarea', 'number', 'select', 'checkbox', 'consent');
```

Rótulos pt-BR: `lead` = Lead · `prospect` = Em negociação · `customer` = Cliente · `inactive` = Inativo; `admin` = Administrador · `manager` = Gestor · `sales` = Operador comercial.

## 4. Tabelas

### 4.1 Identidade e acesso

**`profiles`** — espelho de `auth.users` criado por gatilho no cadastro/convite.
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | uuid PK | FK `auth.users(id) on delete cascade` |
| `full_name` | text | 1–120 |
| `avatar_media_id` | uuid | FK `media_assets` `on delete set null` |
| `is_active` | boolean | default `true` |
| `created_at`, `updated_at` | timestamptz | |

**`user_roles`** — um perfil por usuário.
| Coluna | Tipo | Regras |
|---|---|---|
| `user_id` | uuid PK | FK `profiles(id) on delete cascade` |
| `role` | `app_role` | not null |
| `granted_by` | uuid | FK `profiles` `on delete set null` |
| `created_at`, `updated_at` | timestamptz | |

Gatilho impede remover/rebaixar o último `admin` ativo.

**`business_settings`** — linha única (`id boolean primary key default true check (id)`).
| Grupo | Colunas |
|---|---|
| Empresa | `trade_name`, `legal_name`, `tax_id` (CNPJ/CPF, opcional), `email`, `phone`, `whatsapp`, `address jsonb`, `social jsonb` (instagram, facebook, linkedin, youtube, tiktok) |
| Marca | `logo_media_id`, `favicon_media_id`, `theme_draft jsonb`, `theme_published jsonb` (cores, fontes, raio, estilo de botão — validado por schema) |
| Regional | `timezone default 'America/Sao_Paulo'`, `currency default 'BRL'`, `locale default 'pt-BR'` |
| Privacidade | `privacy_policy jsonb` (documento de blocos), `dpo_contact`, `tracking_enabled boolean default false` |
| Comercial | `default_pipeline_id`, `default_deal_owner_id`, `dedup_window_hours int default 24` |
| Controle | `updated_at`, `updated_by` |

Dados públicos (nome, contatos, redes, tema publicado, logo) **não** são lidos diretamente pelo anônimo: são expostos pela RPC `get_public_site()`, que devolve só os campos permitidos.

### 4.2 Contatos

**`lead_sources`** — `id`, `key text unique` (`site_form`, `manual`, `whatsapp`, `instagram`, `referral`, `import`…), `label`, `is_system boolean`, `active boolean`.

**`contacts`**
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | uuid PK | |
| `name` | text not null | 1–160 |
| `email` | text | formato básico por CHECK, ≤ 254 |
| `email_normalized` | text | `generated always as (lower(trim(email))) stored` |
| `phone`, `whatsapp` | text | ≤ 30 |
| `phone_normalized` | text | só dígitos com DDI (função imutável `normalize_phone`) — gerada |
| `company` | text | ≤ 160 |
| `notes` | text | ≤ 5000 |
| `lifecycle` | `contact_lifecycle` | default `lead` |
| `source_id` | uuid | FK `lead_sources` `on delete restrict` |
| `source_detail` | text | ex.: slug da página, campanha |
| `utm` | jsonb | `{source, medium, campaign, term, content}` da primeira captação |
| `owner_id` | uuid | FK `profiles` `on delete set null` |
| `legal_basis` | text | `consent` \| `legitimate_interest` \| `contract` |
| `consent_at` | timestamptz | |
| `customer_since` | timestamptz | preenchido na conversão |
| `created_by` | uuid | FK `profiles` `on delete set null` |
| `created_at`, `updated_at` | timestamptz | |
| `deleted_at`, `anonymized_at` | timestamptz | |

Índices: `email_normalized`, `phone_normalized` (parciais `where deleted_at is null`), `owner_id`, `source_id`, `(lifecycle, created_at desc)`, `created_at desc`; `gin (name gin_trgm_ops)` para busca (extensão `pg_trgm`).

**Duplicidade:** não há `unique` (pessoas reais podem compartilhar telefone); a RPC `find_duplicate_contacts(email, phone)` alimenta o aviso no cadastro e o `ingest_submission` reutiliza o contato encontrado por e-mail normalizado, ou por telefone se não houver e-mail.

### 4.3 CRM

**`pipelines`** — `id`, `name`, `position`, `is_default boolean` (índice único parcial `where is_default`), `archived_at`, timestamps.

**`pipeline_stages`**
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | uuid PK | |
| `pipeline_id` | uuid | FK `pipelines on delete cascade` |
| `name` | text | 1–60 |
| `color` | text | `^#[0-9a-f]{6}$` |
| `position` | int | |
| `probability` | smallint | 0–100 |
| `is_won` | boolean | único por funil (índice parcial) |
| `archived_at` | timestamptz | etapa com oportunidades não é apagada, só arquivada |

`unique (id, pipeline_id)` para permitir FK composta em `deals`.

**`lost_reasons`** — `id`, `label`, `active`, `position`.

**`deals`**
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | uuid PK | |
| `title` | text | 1–160 |
| `contact_id` | uuid not null | FK `contacts on delete restrict` |
| `pipeline_id`, `stage_id` | uuid not null | FK composta `(stage_id, pipeline_id) → pipeline_stages(id, pipeline_id)` — garante etapa do mesmo funil |
| `owner_id` | uuid | FK `profiles on delete set null` |
| `amount` | numeric(14,2) | `>= 0`, default 0 |
| `currency` | char(3) | default `BRL` |
| `status` | `deal_status` | default `open` |
| `position` | numeric | ordenação no Kanban |
| `expected_close_date` | date | |
| `next_action`, `next_action_at` | text, timestamptz | |
| `lost_reason_id`, `lost_note` | uuid, text | CHECK: `status <> 'lost' or lost_reason_id is not null` |
| `closed_at` | timestamptz | CHECK: `(status = 'open') = (closed_at is null)` |
| `source_submission_id` | uuid | FK `form_submissions on delete set null` |
| `created_by`, `created_at`, `updated_at`, `deleted_at` | | |

Índices: `(pipeline_id, stage_id, position) where status='open' and deleted_at is null` (Kanban), `owner_id`, `contact_id`, `(status, closed_at)`, `created_at`.

**`deal_events`** — histórico automático (gatilho `after update` em `deals`): `id`, `deal_id` (FK cascade), `actor_id`, `type` (`created`, `stage_changed`, `amount_changed`, `owner_changed`, `status_changed`), `from_value jsonb`, `to_value jsonb`, `created_at`. Somente leitura para usuários.

**`activities`** — `id`, `contact_id` (FK restrict), `deal_id` (FK set null), `type activity_type`, `body text ≤ 5000`, `occurred_at`, `created_by`, `created_at`. Índices `(contact_id, occurred_at desc)`, `(deal_id, occurred_at desc)`.

**`tasks`** — `id`, `title`, `description`, `due_at`, `completed_at`, `assignee_id` (FK profiles set null), `contact_id`, `deal_id` (FK set null), `created_by`, timestamps. Índice parcial `(assignee_id, due_at) where completed_at is null`.

### 4.4 Site e páginas

**`media_assets`** — `id`, `bucket` (`site-media` \| `private-files`), `path text unique`, `mime`, `size_bytes`, `width`, `height`, `alt`, `uploaded_by`, `created_at`. Tamanho e MIME também limitados na configuração do bucket.

**`page_templates`** — `id`, `key unique`, `name`, `description`, `category`, `thumbnail_media_id`, `schema_version int`, `document jsonb`, `is_system boolean`, `created_at`. Templates de sistema vêm do `seed.sql`.

**`pages`**
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | uuid PK | |
| `kind` | `page_kind` | índice único parcial `where kind='home'` (uma Home) |
| `title` | text | 1–120 |
| `slug` | text | CHECK formato `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–80; `null` se `home`, obrigatório se `landing`; `unique`; CHECK contra lista reservada |
| `status` | `page_status` | default `draft` |
| `draft_version_id` | uuid | FK `page_versions` (deferrable) |
| `published_version_id` | uuid | FK `page_versions` (deferrable) |
| `template_id` | uuid | FK `page_templates on delete set null` |
| `published_at`, `archived_at` | timestamptz | |
| `created_by`, `created_at`, `updated_at`, `updated_by` | | |

> **Implementado (2026-11-09, migração `20261111120000_site_pages.sql`):** o rascunho fica em `pages.draft_document` (jsonb) com `draft_updated_at` para detectar edição concorrente, em vez de `draft_version_id`. Só as publicações geram linhas em `page_versions` (imutáveis: sem privilégio de UPDATE). Escrita apenas pelas RPCs `ensure_home_page`, `save_page_draft` e `publish_page` (admin); leitura pública só por `get_public_site()`.

**`page_versions`**
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | uuid PK | |
| `page_id` | uuid | FK `pages on delete cascade` |
| `version_number` | int | `unique (page_id, version_number)` |
| `schema_version` | int | versão do formato `PageDocument` |
| `document` | jsonb | inclui `seo` (title, description, ogImage, canonical, noindex); tamanho ≤ 512 kB (CHECK `pg_column_size`) |
| `is_snapshot` | boolean | `true` = versão publicada/imutável (gatilho bloqueia `update`) |
| `created_by`, `created_at` | | |

**`forms`**
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `page_id` | uuid | FK `pages on delete set null` (página “principal”; o bloco de formulário referencia `form_id`) |
| `create_deal` | boolean | default `true` |
| `pipeline_id`, `stage_id` | uuid | FK composta como em `deals`; obrigatórios se `create_deal` |
| `default_owner_id` | uuid | FK profiles |
| `source_label` | text | gravado em `contacts.source_detail` |
| `success_message` | text | ≤ 300 |
| `redirect_path` | text | rota interna ou `https:` validada |
| `consent_required` | boolean | |
| `consent_text` | text | snapshot gravado em cada submissão |
| `captcha_enabled` | boolean | default `false` |
| `is_active` | boolean | |
| `created_at`, `updated_at` | | |

**`form_fields`** — `id`, `form_id` (FK cascade), `key` (`^[a-z][a-z0-9_]{0,39}$`, `unique (form_id, key)`), `label`, `type form_field_type`, `required`, `placeholder`, `options jsonb` (para `select`), `maps_to` (`name`\|`email`\|`phone`\|`whatsapp`\|`company`\|`null`), `position`.

**`form_submissions`**
| Coluna | Tipo | Regras |
|---|---|---|
| `id` | uuid PK | |
| `form_id` | uuid | FK `forms on delete restrict` (formulário com envios é desativado, não apagado) |
| `page_id`, `page_version_id` | uuid | FK `set null` |
| `contact_id` | uuid | FK `contacts on delete set null` |
| `deal_id` | uuid | FK `deals on delete set null` |
| `submission_key` | uuid | **`unique`** — idempotência (gerada no navegador a cada carregamento do formulário) |
| `payload` | jsonb | só campos definidos no formulário |
| `utm`, `referrer` | jsonb, text | |
| `ip_hash` | text | `sha256(ip ‖ sal ‖ data)` — não reversível, rotaciona por dia |
| `consent_at`, `consent_text` | | snapshot |
| `is_duplicate` | boolean | mesmo contato+formulário dentro da janela de deduplicação → não cria nova oportunidade |
| `created_at` | timestamptz | |

Índices: `(form_id, created_at desc)`, `(page_id, created_at desc)`, `contact_id`, `deal_id`.

**`page_events`** (P1) — `id bigint identity`, `page_id` (FK cascade), `type` (`page_view`, `form_start`, `form_submit`), `occurred_at`, `visitor_hash` (diário), `referrer_host`, `utm_source`, `utm_medium`, `utm_campaign`, `device` (`mobile`\|`tablet`\|`desktop`). Índice BRIN em `occurred_at` + `(page_id, occurred_at)`. Retenção configurável (padrão 13 meses).

### 4.5 Infraestrutura

**`audit_logs`** — `id bigint identity`, `actor_id`, `action` (`insert`\|`update`\|`delete`\|`publish`\|`role_change`\|…), `entity_type`, `entity_id`, `diff jsonb` (sem PII em texto livre), `created_at`. Preenchida por gatilhos em `user_roles`, `profiles.is_active`, `business_settings`, `pages` (publicação/exclusão), `forms`, exclusões de `contacts`/`deals`.

**`rate_limit_hits`** — `bucket text`, `window_start timestamptz`, `hits int`, PK `(bucket, window_start)`. Sem acesso para `anon`/`authenticated` (só funções).

## 5. Matriz de permissões (RLS)

Legenda: **R** ler · **C** criar · **U** atualizar · **D** excluir · “próprios” = `owner_id/assignee_id = auth.uid()` ou vinculados a oportunidade própria.

| Tabela | Admin | Gestor | Operador | Anônimo |
|---|---|---|---|---|
| `profiles` | RCUD | R | R (nome/avatar) | — |
| `user_roles` | RCUD (via função) | R | R (o próprio) | — |
| `business_settings` | RU | R | R | via `get_public_site()` |
| `lead_sources`, `lost_reasons` | RCUD | RCU | R | — |
| `pipelines`, `pipeline_stages` | RCUD | R | R | — |
| `contacts` | RCUD | RCU (D lógico) | RCU próprios¹ | — |
| `deals` | RCUD | RCUD | RCU próprios | — |
| `deal_events` | R | R | R próprios | — |
| `activities` | RCUD | RCUD | RC próprios; UD as que criou | — |
| `tasks` | RCUD | RCUD | RCU atribuídas/criadas | — |
| `pages`, `page_versions`, `page_templates` | RCUD | R | — | via `get_published_page()` |
| `forms`, `form_fields` | RCUD | R | — | via `get_public_form()` |
| `form_submissions` | R | R | R das próprias oportunidades | — (só Edge Function) |
| `media_assets` | RCUD | R | — | — (arquivos lidos pelo bucket público) |
| `page_events` | R | R | — | — (só Edge Function) |
| `audit_logs` | R | — | — | — |

¹ Operador vê contatos em que é `owner_id` ou que tenham oportunidade sua. Visibilidade de leads **sem responsável** pelo operador é decisão pendente (padrão proposto: não; o gestor distribui).

### 5.1 Funções auxiliares

```sql
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select ur.role
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.user_id = (select auth.uid()) and p.is_active
$$;

create or replace function public.has_role(required public.app_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() = any(required), false) $$;

revoke execute on function public.current_app_role(), public.has_role(public.app_role[]) from public, anon;
grant  execute on function public.current_app_role(), public.has_role(public.app_role[]) to authenticated;
```

### 5.2 Exemplo de política

```sql
alter table public.deals enable row level security;
alter table public.deals force row level security;

create policy deals_select on public.deals
  for select to authenticated
  using (
    (select public.has_role(array['admin','manager']::public.app_role[]))
    or (owner_id = (select auth.uid()) and (select public.has_role(array['sales']::public.app_role[])))
  );

create policy deals_update on public.deals
  for update to authenticated
  using (
    (select public.has_role(array['admin','manager']::public.app_role[]))
    or owner_id = (select auth.uid())
  )
  with check (
    (select public.has_role(array['admin','manager']::public.app_role[]))
    or owner_id = (select auth.uid())   -- operador não transfere a oportunidade para outro
  );
```

Teste automático (pgTAP) verifica que **toda** tabela em `public` tem `relrowsecurity = true` e que cada perfil enxerga apenas o esperado.

## 6. Funções RPC

| Função | Executável por | Descrição |
|---|---|---|
| `move_deal(deal_id, to_stage_id, before_id?, after_id?)` | authenticated | Valida acesso e funil, calcula `position`, atualiza; histórico via gatilho. Se etapa `is_won` → `status='won'`, `closed_at=now()`. |
| `close_deal_won(deal_id)` / `close_deal_lost(deal_id, reason_id, note)` | authenticated | Fecham a oportunidade; ganho converte o contato em `customer` (`customer_since`). |
| `reopen_deal(deal_id)` | admin, manager | |
| `convert_contact_to_customer(contact_id)` | authenticated (com acesso) | Conversão manual sem duplicar registro. |
| `find_duplicate_contacts(email, phone)` | authenticated | Retorna candidatos respeitando RLS (`security invoker`). |
| `publish_page(page_id)` / `unpublish_page(page_id)` / `duplicate_page(page_id, new_slug)` / `restore_page_version(version_id)` | admin | Transacionais, com auditoria. |
| `publish_theme()` | admin | `theme_draft → theme_published`. |
| `get_public_site()` | anon, authenticated | Configurações públicas + Home publicada + tema publicado. |
| `get_published_page(slug)` | anon, authenticated | Documento publicado + formulários públicos referenciados (só campos/labels). |
| `ingest_submission(...)` | **somente `service_role`** | Chamado pela Edge Function: contato (localizar/criar) → submissão → oportunidade (se configurado e não duplicado) → atividade `form_submission`. Tudo em uma transação; `on conflict (submission_key) do nothing` retorna o resultado anterior. |
| `dashboard_metrics(from, to)` / `report_*` | authenticated | Métricas do PRD §5, `security invoker` (respeitam RLS). |
| `bootstrap_first_admin(email)` | `postgres` (SQL Editor, uma vez) | Cria o primeiro admin; falha se já houver um. |
| `anonymize_contact(contact_id)` | admin | LGPD: substitui PII por marcadores, mantém métricas agregadas. |

## 7. Storage

| Bucket | Público | Escrita | Regras |
|---|---|---|---|
| `site-media` | Sim (leitura) | admin | JPEG/PNG/WebP/AVIF, ≤ 5 MB, caminho `yyyy/mm/<uuid>.<ext>` |
| `private-files` | Não | admin, manager | Anexos de contatos/oportunidades (P2); URLs assinadas de curta duração |

## 8. Ordem das migrações

```
0001_extensions.sql            pg_trgm (e pgcrypto se necessário)
0002_enums.sql
0003_identity.sql              profiles, user_roles, gatilho on auth.users, helpers de perfil
0004_settings.sql              business_settings, lead_sources, lost_reasons
0005_contacts.sql
0006_crm.sql                   pipelines, stages, deals, deal_events, activities, tasks
0007_site.sql                  media_assets, page_templates, pages, page_versions
0008_forms.sql                 forms, form_fields, form_submissions
0009_infra.sql                 audit_logs, rate_limit_hits, page_events
0010_rls.sql                   enable/force + todas as políticas
0011_functions.sql             RPCs
0012_triggers.sql              updated_at, histórico, auditoria, imutabilidade
0013_storage.sql               buckets e políticas de storage.objects
seed.sql                       funil padrão (6 etapas), origens, motivos de perda, templates
```

Seeds contêm **apenas configuração**, nunca contatos ou oportunidades fictícios.

## 9. Funil padrão (seed)

| # | Etapa | Probabilidade | `is_won` |
|---|---|---|---|
| 1 | Novo lead | 10% | |
| 2 | Primeiro contato | 20% | |
| 3 | Qualificação | 40% | |
| 4 | Proposta enviada | 60% | |
| 5 | Negociação | 80% | |
| 6 | Venda concluída | 100% | ✓ |

“Perdida” = `status='lost'`, fora das colunas, visível por filtro.

## 10. Itens a validar na Fase 3

- Versão do Postgres do projeto Supabase (habilita `uuidv7()` nativo se ≥ 18).
- Disponibilidade de `pg_cron` no plano para limpeza de `rate_limit_hits` e retenção de `page_events`.
- Custom Access Token Hook para levar `app_role` no JWT (otimização opcional; a abordagem por função já é suficiente para o volume esperado).
