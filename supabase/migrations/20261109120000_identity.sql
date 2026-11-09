-- =============================================================================
-- Fase 2 — Identidade e acesso
-- profiles, user_roles, funções de perfil, RLS e bootstrap do primeiro admin.
-- Ver docs/MODELO_BANCO_DADOS.md §4.1 e §5.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'manager', 'sales');

comment on type public.app_role is 'admin = Administrador · manager = Gestor · sales = Operador comercial';

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — espelho de auth.users
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) between 1 and 120),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Dados de perfil dos usuários da dashboard (1:1 com auth.users).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_roles — um perfil de acesso por usuário
-- -----------------------------------------------------------------------------
create table public.user_roles (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  role        public.app_role not null,
  granted_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.user_roles is 'Perfil de acesso. Alterado somente por funções privilegiadas (Edge Functions / bootstrap).';

create index user_roles_granted_by_idx on public.user_roles (granted_by);
create index user_roles_role_idx on public.user_roles (role);

create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Criação automática do profile quando um usuário é convidado/criado no Auth
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), '')
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Funções de perfil usadas nas políticas RLS
-- security definer: leem user_roles/profiles sem depender das políticas dessas tabelas.
-- Usar SEMPRE envolvidas em (select ...) nas políticas para avaliação única por consulta.
-- -----------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select ur.role
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.user_id = (select auth.uid())
    and p.is_active
$$;

create or replace function public.has_role(required public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = any (required), false)
$$;

revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.has_role(public.app_role[]) from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_role(public.app_role[]) to authenticated;

-- -----------------------------------------------------------------------------
-- Proteção: nunca deixar a instalação sem administrador ativo
-- -----------------------------------------------------------------------------
create or replace function public.prevent_removing_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid;
  remaining int;
begin
  if tg_table_name = 'user_roles' then
    if old.role <> 'admin' then
      return coalesce(new, old);
    end if;
    if tg_op = 'UPDATE' and new.role = 'admin' then
      return new;
    end if;
    affected := old.user_id;
  elsif tg_table_name = 'profiles' then
    if not (old.is_active and not new.is_active) then
      return new;
    end if;
    affected := old.id;
    if not exists (select 1 from public.user_roles where user_id = affected and role = 'admin') then
      return new;
    end if;
  end if;

  select count(*) into remaining
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role = 'admin'
    and p.is_active
    and ur.user_id <> affected;

  if remaining = 0 then
    raise exception 'Não é possível remover ou desativar o último administrador ativo.'
      using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function public.prevent_removing_last_admin() from public, anon, authenticated;

create trigger user_roles_keep_last_admin
  before update or delete on public.user_roles
  for each row execute function public.prevent_removing_last_admin();

create trigger profiles_keep_last_admin
  before update of is_active on public.profiles
  for each row execute function public.prevent_removing_last_admin();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- RLS ativada. FORCE não é usado de propósito: as funções security definer acima
-- (executadas como dono da tabela) precisam ler estas tabelas sem reentrar nas
-- políticas — com FORCE, um dono sem BYPASSRLS causaria recursão infinita.
-- O dono só é usado por migrações e por essas funções auditadas.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- Visitantes anônimos não têm acesso algum a estas tabelas.
revoke all on table public.profiles from anon;
revoke all on table public.user_roles from anon;

-- Usuários autenticados: só leitura + atualização do próprio nome.
-- Inserções vêm do gatilho; is_active e perfis só mudam por funções privilegiadas.
revoke insert, update, delete, truncate on table public.profiles from authenticated;
revoke insert, update, delete, truncate on table public.user_roles from authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;

-- profiles: qualquer membro ativo da equipe vê os perfis (nomes de responsáveis no CRM).
create policy profiles_select_staff on public.profiles
  for select to authenticated
  using ((select public.current_app_role()) is not null or id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_roles: cada um vê o próprio perfil; admin e gestor veem todos.
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.has_role(array['admin', 'manager']::public.app_role[]))
  );

-- -----------------------------------------------------------------------------
-- Bootstrap do primeiro administrador (executar UMA vez no SQL Editor)
--   select public.bootstrap_first_admin('email@empresa.com.br');
-- O usuário precisa existir no Auth (convidado pelo painel do Supabase).
-- -----------------------------------------------------------------------------
create or replace function public.bootstrap_first_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'Já existe um administrador. Use a dashboard para gerenciar usuários.';
  end if;

  select u.id into target
  from auth.users u
  where lower(u.email) = lower(trim(p_email));

  if target is null then
    raise exception 'Usuário % não encontrado em auth.users. Convide-o primeiro pelo painel do Supabase.', p_email;
  end if;

  insert into public.profiles (id) values (target) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (target, 'admin');

  return target;
end;
$$;

-- Somente o dono do banco (SQL Editor / service_role) pode executar.
revoke execute on function public.bootstrap_first_admin(text) from public, anon, authenticated;
