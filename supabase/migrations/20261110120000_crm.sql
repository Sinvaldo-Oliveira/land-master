-- =============================================================================
-- Fase 3 — Contatos, funil e CRM
-- Tabelas: lead_sources, lost_reasons, pipelines, pipeline_stages, contacts,
--          deals, deal_events, activities, tasks.
-- Ver docs/MODELO_BANCO_DADOS.md §4.2, §4.3, §5, §6 e §9.
-- Regras de acesso (Fase 3):
--   admin    — tudo
--   manager  — tudo nos contatos e oportunidades; configurações de origem/motivo
--   sales    — contatos e oportunidades próprios (owner_id = auth.uid())
-- Exclusão lógica (deleted_at) em contatos e oportunidades; sem DELETE físico.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Helpers de acesso (security definer: leem tabelas sem depender das políticas)
-- -----------------------------------------------------------------------------
create or replace function public.can_access_contact(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(array['admin', 'manager']::public.app_role[])
    or exists (
      select 1 from public.contacts c
      where c.id = cid and c.owner_id = (select auth.uid()) and c.deleted_at is null
    )
    or exists (
      select 1 from public.deals d
      where d.contact_id = cid and d.owner_id = (select auth.uid()) and d.deleted_at is null
    )
$$;

create or replace function public.can_access_deal(did uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(array['admin', 'manager']::public.app_role[])
    or exists (
      select 1 from public.deals d
      where d.id = did and d.owner_id = (select auth.uid()) and d.deleted_at is null
    )
$$;

revoke execute on function public.can_access_contact(uuid) from public, anon;
revoke execute on function public.can_access_deal(uuid) from public, anon;
grant execute on function public.can_access_contact(uuid) to authenticated;
grant execute on function public.can_access_deal(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Configuração: origens e motivos de perda
-- -----------------------------------------------------------------------------
create table public.lead_sources (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  label       text not null check (char_length(label) between 1 and 80),
  is_system   boolean not null default false,
  active      boolean not null default true,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.lost_reasons (
  id          uuid primary key default gen_random_uuid(),
  label       text not null check (char_length(label) between 1 and 80),
  active      boolean not null default true,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Funis e etapas
-- -----------------------------------------------------------------------------
create table public.pipelines (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 80),
  position     int not null default 0,
  is_default   boolean not null default false,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index pipelines_one_default_idx on public.pipelines (is_default) where is_default;

create table public.pipeline_stages (
  id           uuid primary key default gen_random_uuid(),
  pipeline_id  uuid not null references public.pipelines (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  color        text not null default '#0E7C66' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position     int not null default 0,
  probability  smallint not null default 0 check (probability between 0 and 100),
  is_won       boolean not null default false,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, pipeline_id)
);

create index pipeline_stages_pipeline_idx on public.pipeline_stages (pipeline_id, position);
create unique index pipeline_stages_one_won_idx on public.pipeline_stages (pipeline_id) where is_won and archived_at is null;

-- -----------------------------------------------------------------------------
-- Contatos
-- -----------------------------------------------------------------------------
create table public.contacts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 1 and 160),
  email             text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  email_normalized  text generated always as (nullif(lower(btrim(email)), '')) stored,
  phone             text check (phone is null or char_length(phone) <= 30),
  phone_normalized  text generated always as (nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')) stored,
  whatsapp          text check (whatsapp is null or char_length(whatsapp) <= 30),
  company           text check (company is null or char_length(company) <= 160),
  notes             text check (notes is null or char_length(notes) <= 5000),
  lifecycle         text not null default 'lead' check (lifecycle in ('lead', 'prospect', 'customer', 'inactive')),
  source_id         uuid references public.lead_sources (id) on delete restrict,
  source_detail     text check (source_detail is null or char_length(source_detail) <= 120),
  utm               jsonb not null default '{}'::jsonb,
  owner_id          uuid references public.profiles (id) on delete set null,
  legal_basis       text check (legal_basis is null or legal_basis in ('consent', 'legitimate_interest', 'contract')),
  consent_at        timestamptz,
  customer_since    timestamptz,
  created_by        uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  anonymized_at     timestamptz
);

comment on table public.contacts is 'Pessoas e empresas. Sem unique em e-mail/telefone: o aviso de duplicidade é feito pela função find_duplicate_contacts.';

create index contacts_email_idx on public.contacts (email_normalized) where deleted_at is null;
create index contacts_phone_idx on public.contacts (phone_normalized) where deleted_at is null;
create index contacts_owner_idx on public.contacts (owner_id);
create index contacts_source_idx on public.contacts (source_id);
create index contacts_created_by_idx on public.contacts (created_by);
create index contacts_lifecycle_idx on public.contacts (lifecycle, created_at desc);
create index contacts_created_idx on public.contacts (created_at desc);
create index contacts_name_trgm_idx on public.contacts using gin (name extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Oportunidades
-- -----------------------------------------------------------------------------
create table public.deals (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null check (char_length(title) between 1 and 160),
  contact_id            uuid not null references public.contacts (id) on delete restrict,
  pipeline_id           uuid not null,
  stage_id              uuid not null,
  owner_id              uuid references public.profiles (id) on delete set null,
  amount                numeric(14, 2) not null default 0 check (amount >= 0),
  currency              char(3) not null default 'BRL',
  status                text not null default 'open' check (status in ('open', 'won', 'lost')),
  position              numeric,
  expected_close_date   date,
  next_action           text check (next_action is null or char_length(next_action) <= 160),
  next_action_at        timestamptz,
  lost_reason_id        uuid references public.lost_reasons (id) on delete restrict,
  lost_note             text check (lost_note is null or char_length(lost_note) <= 500),
  closed_at             timestamptz,
  source_submission_id  uuid,
  created_by            uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  foreign key (stage_id, pipeline_id) references public.pipeline_stages (id, pipeline_id),
  check (status <> 'lost' or lost_reason_id is not null),
  check ((status = 'open') = (closed_at is null))
);

create index deals_board_idx on public.deals (pipeline_id, stage_id, position) where status = 'open' and deleted_at is null;
create index deals_owner_idx on public.deals (owner_id);
create index deals_contact_idx on public.deals (contact_id);
create index deals_status_closed_idx on public.deals (status, closed_at);
create index deals_created_idx on public.deals (created_at);
create index deals_lost_reason_idx on public.deals (lost_reason_id);
create index deals_created_by_idx on public.deals (created_by);

-- -----------------------------------------------------------------------------
-- Histórico, atividades e tarefas
-- -----------------------------------------------------------------------------
create table public.deal_events (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.deals (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  type        text not null check (type in ('created', 'stage_changed', 'amount_changed', 'owner_changed', 'status_changed')),
  from_value  jsonb,
  to_value    jsonb,
  created_at  timestamptz not null default now()
);

create index deal_events_deal_idx on public.deal_events (deal_id, created_at desc);
create index deal_events_actor_idx on public.deal_events (actor_id);

create table public.activities (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.contacts (id) on delete restrict,
  deal_id      uuid references public.deals (id) on delete set null,
  type         text not null check (type in ('note', 'call', 'whatsapp', 'email', 'meeting', 'form_submission', 'system')),
  body         text check (body is null or char_length(body) <= 5000),
  occurred_at  timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);

create index activities_contact_idx on public.activities (contact_id, occurred_at desc);
create index activities_deal_idx on public.activities (deal_id, occurred_at desc);
create index activities_created_by_idx on public.activities (created_by);

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 160),
  description   text check (description is null or char_length(description) <= 2000),
  due_at        timestamptz,
  completed_at  timestamptz,
  assignee_id   uuid references public.profiles (id) on delete set null,
  contact_id    uuid references public.contacts (id) on delete set null,
  deal_id       uuid references public.deals (id) on delete set null,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tasks_assignee_due_idx on public.tasks (assignee_id, due_at) where completed_at is null;
create index tasks_contact_idx on public.tasks (contact_id);
create index tasks_deal_idx on public.tasks (deal_id);
create index tasks_created_by_idx on public.tasks (created_by);

-- -----------------------------------------------------------------------------
-- Gatilhos de updated_at
-- -----------------------------------------------------------------------------
create trigger lead_sources_set_updated_at before update on public.lead_sources for each row execute function public.set_updated_at();
create trigger lost_reasons_set_updated_at before update on public.lost_reasons for each row execute function public.set_updated_at();
create trigger pipelines_set_updated_at before update on public.pipelines for each row execute function public.set_updated_at();
create trigger pipeline_stages_set_updated_at before update on public.pipeline_stages for each row execute function public.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts for each row execute function public.set_updated_at();
create trigger deals_set_updated_at before update on public.deals for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Regras de oportunidade na criação: etapa aberta, posição no fim da coluna
-- -----------------------------------------------------------------------------
create or replace function public.deals_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  stage_won boolean;
  stage_archived timestamptz;
begin
  select s.is_won, s.archived_at into stage_won, stage_archived
  from public.pipeline_stages s
  where s.id = new.stage_id;

  if stage_won then
    raise exception 'Uma oportunidade nova não pode começar na etapa de venda concluída.' using errcode = 'P0001';
  end if;
  if stage_archived is not null then
    raise exception 'Esta etapa está arquivada.' using errcode = 'P0001';
  end if;

  new.status := 'open';
  new.closed_at := null;
  new.lost_reason_id := null;
  new.lost_note := null;
  if new.position is null then
    select coalesce(max(d.position), 0) + 1000 into new.position
    from public.deals d
    where d.stage_id = new.stage_id and d.status = 'open' and d.deleted_at is null;
  end if;
  return new;
end;
$$;

create trigger deals_before_insert
  before insert on public.deals
  for each row execute function public.deals_before_insert();

-- -----------------------------------------------------------------------------
-- Histórico automático de oportunidades
-- -----------------------------------------------------------------------------
create or replace function public.deals_record_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.deal_events (deal_id, actor_id, type, to_value)
    values (new.id, (select auth.uid()), 'created',
      jsonb_build_object('stage_id', new.stage_id, 'amount', new.amount, 'owner_id', new.owner_id));
    return new;
  end if;

  if new.stage_id is distinct from old.stage_id then
    insert into public.deal_events (deal_id, actor_id, type, from_value, to_value)
    values (new.id, (select auth.uid()), 'stage_changed',
      jsonb_build_object('stage_id', old.stage_id), jsonb_build_object('stage_id', new.stage_id));
  end if;
  if new.amount is distinct from old.amount then
    insert into public.deal_events (deal_id, actor_id, type, from_value, to_value)
    values (new.id, (select auth.uid()), 'amount_changed',
      jsonb_build_object('amount', old.amount), jsonb_build_object('amount', new.amount));
  end if;
  if new.owner_id is distinct from old.owner_id then
    insert into public.deal_events (deal_id, actor_id, type, from_value, to_value)
    values (new.id, (select auth.uid()), 'owner_changed',
      jsonb_build_object('owner_id', old.owner_id), jsonb_build_object('owner_id', new.owner_id));
  end if;
  if new.status is distinct from old.status then
    insert into public.deal_events (deal_id, actor_id, type, from_value, to_value)
    values (new.id, (select auth.uid()), 'status_changed',
      jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  end if;
  return new;
end;
$$;

create trigger deals_record_events
  after insert or update on public.deals
  for each row execute function public.deals_record_events();

-- -----------------------------------------------------------------------------
-- Nova oportunidade: contato "lead" passa a "em negociação"
-- -----------------------------------------------------------------------------
create or replace function public.deals_promote_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.contacts
  set lifecycle = 'prospect'
  where id = new.contact_id and lifecycle = 'lead';
  return new;
end;
$$;

create trigger deals_promote_contact
  after insert on public.deals
  for each row execute function public.deals_promote_contact();

-- -----------------------------------------------------------------------------
-- RPCs de oportunidade
-- Executam como definer, mas verificam o acesso com can_access_deal() antes.
-- -----------------------------------------------------------------------------
create or replace function public.move_deal(
  p_deal_id uuid,
  p_stage_id uuid,
  p_before_id uuid default null,
  p_after_id uuid default null
)
returns public.deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deals;
  s public.pipeline_stages;
  before_pos numeric;
  after_pos numeric;
  new_pos numeric;
begin
  if not public.can_access_deal(p_deal_id) then
    raise exception 'Sem acesso a esta oportunidade.' using errcode = '42501';
  end if;

  select * into d from public.deals where id = p_deal_id and deleted_at is null for update;
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;
  if d.status <> 'open' then
    raise exception 'Oportunidade encerrada. Reabra-a antes de mudar de etapa.' using errcode = 'P0001';
  end if;

  select * into s from public.pipeline_stages where id = p_stage_id;
  if not found or s.archived_at is not null then
    raise exception 'Etapa inválida.' using errcode = 'P0001';
  end if;

  if p_before_id is not null then
    select position into before_pos from public.deals where id = p_before_id and stage_id = p_stage_id;
  end if;
  if p_after_id is not null then
    select position into after_pos from public.deals where id = p_after_id and stage_id = p_stage_id;
  end if;

  if before_pos is not null and after_pos is not null then
    new_pos := (before_pos + after_pos) / 2;
  elsif before_pos is not null then
    new_pos := before_pos + 1000;
  elsif after_pos is not null then
    new_pos := after_pos - 1000;
  else
    select coalesce(max(position), 0) + 1000 into new_pos
    from public.deals
    where stage_id = p_stage_id and status = 'open' and deleted_at is null and id <> p_deal_id;
  end if;

  if s.is_won then
    update public.deals
    set stage_id = s.id, pipeline_id = s.pipeline_id, position = new_pos,
        status = 'won', closed_at = now()
    where id = p_deal_id
    returning * into d;
    update public.contacts
    set lifecycle = 'customer', customer_since = coalesce(customer_since, now())
    where id = d.contact_id;
  else
    update public.deals
    set stage_id = s.id, pipeline_id = s.pipeline_id, position = new_pos
    where id = p_deal_id
    returning * into d;
  end if;

  return d;
end;
$$;

create or replace function public.close_deal_won(p_deal_id uuid)
returns public.deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deals;
  won_stage uuid;
begin
  if not public.can_access_deal(p_deal_id) then
    raise exception 'Sem acesso a esta oportunidade.' using errcode = '42501';
  end if;

  select * into d from public.deals where id = p_deal_id and deleted_at is null for update;
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;
  if d.status <> 'open' then
    raise exception 'Oportunidade já encerrada.' using errcode = 'P0001';
  end if;

  select s.id into won_stage
  from public.pipeline_stages s
  where s.pipeline_id = d.pipeline_id and s.is_won and s.archived_at is null;
  if won_stage is null then
    raise exception 'O funil não tem uma etapa de venda concluída configurada.' using errcode = 'P0001';
  end if;

  update public.deals
  set status = 'won', closed_at = now(), stage_id = won_stage
  where id = p_deal_id
  returning * into d;

  update public.contacts
  set lifecycle = 'customer', customer_since = coalesce(customer_since, now())
  where id = d.contact_id;

  return d;
end;
$$;

create or replace function public.close_deal_lost(p_deal_id uuid, p_reason_id uuid, p_note text default null)
returns public.deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deals;
begin
  if not public.can_access_deal(p_deal_id) then
    raise exception 'Sem acesso a esta oportunidade.' using errcode = '42501';
  end if;

  select * into d from public.deals where id = p_deal_id and deleted_at is null for update;
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;
  if d.status <> 'open' then
    raise exception 'Oportunidade já encerrada.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.lost_reasons r where r.id = p_reason_id and r.active) then
    raise exception 'Informe um motivo de perda válido.' using errcode = 'P0001';
  end if;

  update public.deals
  set status = 'lost', closed_at = now(), lost_reason_id = p_reason_id,
      lost_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_deal_id
  returning * into d;

  return d;
end;
$$;

create or replace function public.reopen_deal(p_deal_id uuid)
returns public.deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deals;
  first_stage uuid;
begin
  if not public.has_role(array['admin', 'manager']::public.app_role[]) then
    raise exception 'Apenas administradores e gestores podem reabrir oportunidades.' using errcode = '42501';
  end if;

  select * into d from public.deals where id = p_deal_id and deleted_at is null for update;
  if not found then
    raise exception 'Oportunidade não encontrada.' using errcode = 'P0002';
  end if;
  if d.status = 'open' then
    raise exception 'A oportunidade já está aberta.' using errcode = 'P0001';
  end if;

  select s.id into first_stage
  from public.pipeline_stages s
  where s.pipeline_id = d.pipeline_id and not s.is_won and s.archived_at is null
  order by s.position
  limit 1;

  update public.deals
  set status = 'open', closed_at = null, lost_reason_id = null, lost_note = null,
      stage_id = case when stage_id in (select id from public.pipeline_stages where is_won) then coalesce(first_stage, stage_id) else stage_id end,
      position = null
  where id = p_deal_id
  returning * into d;

  return d;
end;
$$;

-- -----------------------------------------------------------------------------
-- Conversão manual e aviso de duplicidade
-- -----------------------------------------------------------------------------
create or replace function public.convert_contact_to_customer(p_contact_id uuid)
returns public.contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contacts;
begin
  if not public.can_access_contact(p_contact_id) then
    raise exception 'Sem acesso a este contato.' using errcode = '42501';
  end if;

  update public.contacts
  set lifecycle = 'customer', customer_since = coalesce(customer_since, now())
  where id = p_contact_id and deleted_at is null
  returning * into c;

  if not found then
    raise exception 'Contato não encontrado.' using errcode = 'P0002';
  end if;
  return c;
end;
$$;

create or replace function public.find_duplicate_contacts(p_email text, p_phone text)
returns table (id uuid, name text, email text, phone text, lifecycle text, owner_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.name, c.email, c.phone, c.lifecycle, c.owner_id
  from public.contacts c
  where c.deleted_at is null
    and (
      (nullif(lower(btrim(coalesce(p_email, ''))), '') is not null
        and c.email_normalized = lower(btrim(p_email)))
      or
      (nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '') is not null
        and c.phone_normalized = regexp_replace(p_phone, '\D', '', 'g'))
    )
  order by c.created_at desc
  limit 5
$$;

revoke execute on function public.move_deal(uuid, uuid, uuid, uuid) from public, anon;
revoke execute on function public.close_deal_won(uuid) from public, anon;
revoke execute on function public.close_deal_lost(uuid, uuid, text) from public, anon;
revoke execute on function public.reopen_deal(uuid) from public, anon;
revoke execute on function public.convert_contact_to_customer(uuid) from public, anon;
revoke execute on function public.find_duplicate_contacts(text, text) from public, anon;
grant execute on function public.move_deal(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.close_deal_won(uuid) to authenticated;
grant execute on function public.close_deal_lost(uuid, uuid, text) to authenticated;
grant execute on function public.reopen_deal(uuid) to authenticated;
grant execute on function public.convert_contact_to_customer(uuid) to authenticated;
grant execute on function public.find_duplicate_contacts(text, text) to authenticated;

-- Gatilhos e auxiliares internos não são chamáveis por clientes
revoke execute on function public.deals_before_insert() from public, anon, authenticated;
revoke execute on function public.deals_record_events() from public, anon, authenticated;
revoke execute on function public.deals_promote_contact() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Privilégios (somente o necessário; anônimo não acessa nada deste módulo)
-- -----------------------------------------------------------------------------
alter table public.lead_sources enable row level security;
alter table public.lost_reasons enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.deal_events enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;

revoke all on table public.lead_sources, public.lost_reasons, public.pipelines, public.pipeline_stages,
  public.contacts, public.deals, public.deal_events, public.activities, public.tasks from anon;
revoke all on table public.lead_sources, public.lost_reasons, public.pipelines, public.pipeline_stages,
  public.contacts, public.deals, public.deal_events, public.activities, public.tasks from authenticated;

grant select on table public.lead_sources, public.lost_reasons, public.pipelines, public.pipeline_stages to authenticated;
grant insert, update on table public.pipelines, public.pipeline_stages to authenticated;
grant insert, update on table public.lead_sources, public.lost_reasons to authenticated;

grant select on table public.contacts to authenticated;
grant insert (name, email, phone, whatsapp, company, notes, lifecycle, source_id, source_detail, owner_id, legal_basis, consent_at, created_by)
  on table public.contacts to authenticated;
grant update (name, email, phone, whatsapp, company, notes, lifecycle, source_id, source_detail, owner_id, legal_basis, consent_at, deleted_at)
  on table public.contacts to authenticated;

grant select on table public.deals to authenticated;
grant insert (title, contact_id, pipeline_id, stage_id, owner_id, amount, currency, expected_close_date, next_action, next_action_at, created_by)
  on table public.deals to authenticated;
-- Etapa, posição, status e fechamento só mudam pelas RPCs acima.
grant update (title, owner_id, amount, currency, expected_close_date, next_action, next_action_at, deleted_at)
  on table public.deals to authenticated;

grant select on table public.deal_events to authenticated;

grant select, insert, update, delete on table public.activities to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

-- -----------------------------------------------------------------------------
-- Políticas RLS
-- -----------------------------------------------------------------------------
-- Configuração: todos os perfis leem; só admin (funis) ou admin/gestor (origens e motivos) alteram.
create policy lead_sources_select on public.lead_sources
  for select to authenticated using (true);
create policy lead_sources_write on public.lead_sources
  for all to authenticated
  using ((select public.has_role(array['admin', 'manager']::public.app_role[])))
  with check ((select public.has_role(array['admin', 'manager']::public.app_role[])));

create policy lost_reasons_select on public.lost_reasons
  for select to authenticated using (true);
create policy lost_reasons_write on public.lost_reasons
  for all to authenticated
  using ((select public.has_role(array['admin', 'manager']::public.app_role[])))
  with check ((select public.has_role(array['admin', 'manager']::public.app_role[])));

create policy pipelines_select on public.pipelines
  for select to authenticated using (true);
create policy pipelines_write on public.pipelines
  for all to authenticated
  using ((select public.has_role(array['admin']::public.app_role[])))
  with check ((select public.has_role(array['admin']::public.app_role[])));

create policy pipeline_stages_select on public.pipeline_stages
  for select to authenticated using (true);
create policy pipeline_stages_write on public.pipeline_stages
  for all to authenticated
  using ((select public.has_role(array['admin']::public.app_role[])))
  with check ((select public.has_role(array['admin']::public.app_role[])));

-- Contatos
create policy contacts_select on public.contacts
  for select to authenticated
  using (deleted_at is null and (select public.can_access_contact(id)));

create policy contacts_insert on public.contacts
  for insert to authenticated
  with check (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or owner_id = (select auth.uid())
  );

create policy contacts_update on public.contacts
  for update to authenticated
  using ((select public.can_access_contact(id)))
  with check (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or (owner_id = (select auth.uid()) and deleted_at is null)
  );

-- Oportunidades
create policy deals_select on public.deals
  for select to authenticated
  using (deleted_at is null and (select public.can_access_deal(id)));

create policy deals_insert on public.deals
  for insert to authenticated
  with check (
    (
      (select public.has_role(array['admin', 'manager']::public.app_role[]))
      or owner_id = (select auth.uid())
    )
    and (select public.can_access_contact(contact_id))
  );

create policy deals_update on public.deals
  for update to authenticated
  using ((select public.can_access_deal(id)))
  with check (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or (owner_id = (select auth.uid()) and deleted_at is null)
  );

-- Histórico: leitura conforme acesso à oportunidade; escrita só pelos gatilhos.
create policy deal_events_select on public.deal_events
  for select to authenticated
  using ((select public.can_access_deal(deal_id)));

-- Atividades
create policy activities_select on public.activities
  for select to authenticated
  using ((select public.can_access_contact(contact_id)));

create policy activities_insert on public.activities
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.can_access_contact(contact_id))
  );

create policy activities_update on public.activities
  for update to authenticated
  using (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or created_by = (select auth.uid())
  )
  with check (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or created_by = (select auth.uid())
  );

create policy activities_delete on public.activities
  for delete to authenticated
  using (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or created_by = (select auth.uid())
  );

-- Tarefas
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or assignee_id = (select auth.uid())
    or created_by = (select auth.uid())
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (contact_id is null or (select public.can_access_contact(contact_id)))
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or assignee_id = (select auth.uid())
    or created_by = (select auth.uid())
  )
  with check (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or assignee_id = (select auth.uid())
    or created_by = (select auth.uid())
  );

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (
    (select public.has_role(array['admin', 'manager']::public.app_role[]))
    or created_by = (select auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Configuração inicial (somente configuração, sem contatos ou oportunidades)
-- -----------------------------------------------------------------------------
insert into public.lead_sources (key, label, is_system, position) values
  ('manual', 'Cadastro manual', true, 1),
  ('site_form', 'Formulário do site', true, 2),
  ('whatsapp', 'WhatsApp', false, 3),
  ('instagram', 'Instagram', false, 4),
  ('referral', 'Indicação', false, 5),
  ('import', 'Importação', true, 6)
on conflict (key) do nothing;

insert into public.lost_reasons (label, position) values
  ('Preço', 1),
  ('Sem orçamento', 2),
  ('Escolheu concorrente', 3),
  ('Sem resposta', 4),
  ('Desistiu da compra', 5),
  ('Outro', 6);

insert into public.pipelines (name, position, is_default) values ('Vendas', 1, true);

insert into public.pipeline_stages (pipeline_id, name, color, position, probability, is_won)
select p.id, s.name, s.color, s.position, s.probability, s.is_won
from public.pipelines p
cross join (values
  ('Novo lead', '#64748B', 1, 10, false),
  ('Primeiro contato', '#2563EB', 2, 20, false),
  ('Qualificação', '#7C3AED', 3, 40, false),
  ('Proposta enviada', '#D97706', 4, 60, false),
  ('Negociação', '#DB2777', 5, 80, false),
  ('Venda concluída', '#0E7C66', 6, 100, true)
) as s(name, color, position, probability, is_won)
where p.is_default;
