-- =============================================================================
-- Fase 4 — Páginas do site (Home) com rascunho e versões publicadas
-- pages: rascunho editável (draft_document) + ponteiro para a versão publicada.
-- page_versions: cópias IMUTÁVEIS de cada publicação (histórico e restauração).
-- Escrita somente pelas RPCs abaixo (admin). Visitantes leem só a versão
-- publicada da Home via get_public_site().
-- Ver docs/MODELO_BANCO_DADOS.md §4.4 e docs/ESTRATEGIA_PUBLICACAO.md.
-- =============================================================================

create table public.pages (
  id                    uuid primary key default gen_random_uuid(),
  kind                  text not null check (kind in ('home', 'landing')),
  title                 text not null check (char_length(title) between 1 and 120),
  slug                  text,
  status                text not null default 'draft' check (status in ('draft', 'published', 'unpublished', 'archived')),
  draft_document        jsonb not null,
  draft_updated_at      timestamptz not null default now(),
  draft_updated_by      uuid references public.profiles (id) on delete set null,
  published_version_id  uuid,
  published_at          timestamptz,
  created_by            uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (
    (kind = 'home' and slug is null)
    or (kind = 'landing' and slug is not null and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80)
  ),
  check (pg_column_size(draft_document) <= 524288)
);

comment on table public.pages is 'Páginas do site. draft_document = rascunho; published_version_id = versão no ar.';

create unique index pages_one_home_idx on public.pages (kind) where kind = 'home';
create unique index pages_slug_idx on public.pages (slug) where slug is not null;
create index pages_draft_updated_by_idx on public.pages (draft_updated_by);
create index pages_created_by_idx on public.pages (created_by);

create table public.page_versions (
  id              uuid primary key default gen_random_uuid(),
  page_id         uuid not null references public.pages (id) on delete cascade,
  version_number  int not null,
  schema_version  int not null,
  document        jsonb not null check (pg_column_size(document) <= 524288),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (page_id, version_number)
);

create index page_versions_created_by_idx on public.page_versions (created_by);

alter table public.pages
  add constraint pages_published_version_fk
  foreign key (published_version_id) references public.page_versions (id) on delete set null;
create index pages_published_version_idx on public.pages (published_version_id);

create trigger pages_set_updated_at before update on public.pages for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Validação estrutural mínima do documento (a validação completa é feita no painel)
-- -----------------------------------------------------------------------------
create or replace function public.assert_page_document(p_document jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_document is null or jsonb_typeof(p_document) <> 'object' then
    raise exception 'Documento da página inválido.' using errcode = 'P0001';
  end if;
  if (p_document ->> 'schemaVersion') is distinct from '1' then
    raise exception 'Versão do documento não suportada.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_document -> 'sections') <> 'array' or jsonb_typeof(p_document -> 'theme') <> 'object' then
    raise exception 'Documento sem seções ou sem tema.' using errcode = 'P0001';
  end if;
  if pg_column_size(p_document) > 524288 then
    raise exception 'Documento acima do tamanho máximo (512 kB).' using errcode = 'P0001';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPCs do painel (somente administrador)
-- -----------------------------------------------------------------------------

-- Cria a Home a partir do template enviado pelo painel, se ainda não existir.
create or replace function public.ensure_home_page(p_document jsonb)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pages;
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem editar o site.' using errcode = '42501';
  end if;

  select * into p from public.pages where kind = 'home';
  if found then
    return p;
  end if;

  perform public.assert_page_document(p_document);
  insert into public.pages (kind, title, draft_document, draft_updated_by, created_by)
  values ('home', 'Página inicial', p_document, (select auth.uid()), (select auth.uid()))
  returning * into p;
  return p;
end;
$$;

-- Salva o rascunho. p_expected_updated_at evita sobrescrever alterações de outra sessão.
create or replace function public.save_page_draft(
  p_page_id uuid,
  p_document jsonb,
  p_expected_updated_at timestamptz default null
)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pages;
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem editar o site.' using errcode = '42501';
  end if;
  perform public.assert_page_document(p_document);

  select * into p from public.pages where id = p_page_id for update;
  if not found then
    raise exception 'Página não encontrada.' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is not null and p.draft_updated_at <> p_expected_updated_at then
    raise exception 'O rascunho foi alterado em outra sessão. Recarregue a página para ver a versão mais recente.'
      using errcode = 'P0001';
  end if;

  update public.pages
  set draft_document = p_document, draft_updated_at = now(), draft_updated_by = (select auth.uid())
  where id = p_page_id
  returning * into p;
  return p;
end;
$$;

-- Publica o rascunho atual como nova versão imutável.
create or replace function public.publish_page(p_page_id uuid)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pages;
  next_version int;
  v_id uuid;
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem publicar o site.' using errcode = '42501';
  end if;

  select * into p from public.pages where id = p_page_id for update;
  if not found then
    raise exception 'Página não encontrada.' using errcode = 'P0002';
  end if;
  perform public.assert_page_document(p.draft_document);

  select coalesce(max(version_number), 0) + 1 into next_version from public.page_versions where page_id = p_page_id;

  insert into public.page_versions (page_id, version_number, schema_version, document, created_by)
  values (p_page_id, next_version, (p.draft_document ->> 'schemaVersion')::int, p.draft_document, (select auth.uid()))
  returning id into v_id;

  update public.pages
  set published_version_id = v_id, status = 'published', published_at = now()
  where id = p_page_id
  returning * into p;
  return p;
end;
$$;

-- -----------------------------------------------------------------------------
-- Leitura pública: somente o documento PUBLICADO da Home (nada de rascunho, nada de CRM)
-- -----------------------------------------------------------------------------
create or replace function public.get_public_site()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'home',
    (
      select v.document
      from public.pages p
      join public.page_versions v on v.id = p.published_version_id
      where p.kind = 'home' and p.status = 'published'
    )
  )
$$;

revoke execute on function public.assert_page_document(jsonb) from public, anon, authenticated;
revoke execute on function public.ensure_home_page(jsonb) from public, anon;
revoke execute on function public.save_page_draft(uuid, jsonb, timestamptz) from public, anon;
revoke execute on function public.publish_page(uuid) from public, anon;
revoke execute on function public.get_public_site() from public;
grant execute on function public.ensure_home_page(jsonb) to authenticated;
grant execute on function public.save_page_draft(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.publish_page(uuid) to authenticated;
grant execute on function public.get_public_site() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS: leitura no painel para admin e gestor; escrita apenas pelas RPCs
-- -----------------------------------------------------------------------------
alter table public.pages enable row level security;
alter table public.page_versions enable row level security;

revoke all on table public.pages, public.page_versions from anon, authenticated;
grant select on table public.pages, public.page_versions to authenticated;

create policy pages_select on public.pages
  for select to authenticated
  using ((select public.has_role(array['admin', 'manager']::public.app_role[])));

create policy page_versions_select on public.page_versions
  for select to authenticated
  using ((select public.has_role(array['admin', 'manager']::public.app_role[])));
