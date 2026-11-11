-- =============================================================================
-- Landing Page Builder — Etapa 1: gerenciamento de landing pages
-- Reutiliza public.pages (kind = 'landing') e public.page_versions. Nenhuma tabela nova.
--  - coluna pages.archived_at
--  - assert_page_document aceita o documento v2 (árvore de blocos) e confere os limites
--  - ensure_home_page e save_page_draft passam a exigir v1 na Home e v2 nas landing pages
--  - RPCs de criar, duplicar, renomear/trocar endereço, despublicar, arquivar,
--    restaurar, excluir e listar (todas só para administrador)
-- Script idempotente e NÃO destrutivo: não apaga tabelas, colunas nem dados.
-- Ver docs/BANCO_LANDING_BUILDER.md §2.
-- =============================================================================

alter table public.pages add column if not exists archived_at timestamptz;
comment on column public.pages.archived_at is 'Quando a página foi arquivada (null = não arquivada).';

-- -----------------------------------------------------------------------------
-- Validação estrutural do documento (v1 = Home, v2 = landing em árvore de blocos)
-- -----------------------------------------------------------------------------
create or replace function public.assert_page_document(p_document jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_version text;
  v_count int;
  v_depth int;
  v_malformed boolean;
begin
  if p_document is null or jsonb_typeof(p_document) <> 'object' then
    raise exception 'Documento da página inválido.' using errcode = 'P0001';
  end if;
  if pg_column_size(p_document) > 524288 then
    raise exception 'Documento acima do tamanho máximo (512 kB).' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_document -> 'theme') is distinct from 'object' then
    raise exception 'Documento sem tema.' using errcode = 'P0001';
  end if;

  v_version := p_document ->> 'schemaVersion';

  if v_version = '1' then
    if jsonb_typeof(p_document -> 'sections') is distinct from 'array' then
      raise exception 'Documento sem seções ou sem tema.' using errcode = 'P0001';
    end if;
    return;
  end if;

  if v_version is distinct from '2' then
    raise exception 'Versão do documento não suportada.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_document -> 'blocks') is distinct from 'array' then
    raise exception 'Documento sem lista de blocos.' using errcode = 'P0001';
  end if;

  -- Percorre a árvore. O corte em 6 níveis limita a recursão; acima de 4 já é erro.
  with recursive tree as (
    select b.value as block, 1 as depth
    from jsonb_array_elements(p_document -> 'blocks') as b(value)
    union all
    select c.value, t.depth + 1
    from tree t
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(t.block -> 'children') = 'array' then t.block -> 'children' else '[]'::jsonb end
    ) as c(value)
    where t.depth < 6
  )
  select
    count(*),
    coalesce(max(depth), 0),
    coalesce(bool_or(
      jsonb_typeof(block) is distinct from 'object'
      or jsonb_typeof(block -> 'id') is distinct from 'string'
      or jsonb_typeof(block -> 'type') is distinct from 'string'
    ), false)
  into v_count, v_depth, v_malformed
  from tree;

  if v_malformed then
    raise exception 'Documento com bloco inválido.' using errcode = 'P0001';
  end if;
  if v_count > 200 then
    raise exception 'A página passou do limite de 200 blocos.' using errcode = 'P0001';
  end if;
  if v_depth > 4 then
    raise exception 'A página passou do limite de 4 níveis de blocos.' using errcode = 'P0001';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Apoio interno: valida nome e endereço, com mensagens para o painel
-- -----------------------------------------------------------------------------
create or replace function public.assert_landing_meta(p_title text, p_slug text, p_ignore_page_id uuid default null)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120 then
    raise exception 'O nome da página deve ter de 1 a 120 caracteres.' using errcode = 'P0001';
  end if;
  if p_slug is null or char_length(p_slug) not between 3 and 80 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Endereço inválido. Use de 3 a 80 letras minúsculas, números e hífen.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.pages
    where slug = p_slug and (p_ignore_page_id is null or id <> p_ignore_page_id)
  ) then
    raise exception 'Já existe uma página com o endereço /lp/%. Escolha outro.', p_slug using errcode = 'P0001';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- ensure_home_page: mesma função de antes + a Home só aceita documento v1
-- -----------------------------------------------------------------------------
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
  if (p_document ->> 'schemaVersion') <> '1' then
    raise exception 'Versão do documento incompatível com este tipo de página.' using errcode = 'P0001';
  end if;
  insert into public.pages (kind, title, draft_document, draft_updated_by, created_by)
  values ('home', 'Página inicial', p_document, (select auth.uid()), (select auth.uid()))
  returning * into p;
  return p;
end;
$$;

-- -----------------------------------------------------------------------------
-- save_page_draft: mesma função de antes + versão do documento conforme o tipo da página
-- -----------------------------------------------------------------------------
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
  if (p.kind = 'home' and (p_document ->> 'schemaVersion') <> '1')
     or (p.kind = 'landing' and (p_document ->> 'schemaVersion') <> '2') then
    raise exception 'Versão do documento incompatível com este tipo de página.' using errcode = 'P0001';
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

-- -----------------------------------------------------------------------------
-- RPCs de gerenciamento (somente administrador)
-- -----------------------------------------------------------------------------

create or replace function public.create_landing_page(p_title text, p_slug text, p_document jsonb)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pages;
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem criar landing pages.' using errcode = '42501';
  end if;
  perform public.assert_landing_meta(p_title, p_slug);
  perform public.assert_page_document(p_document);
  if (p_document ->> 'schemaVersion') <> '2' then
    raise exception 'Versão do documento incompatível com este tipo de página.' using errcode = 'P0001';
  end if;

  begin
    insert into public.pages (kind, title, slug, draft_document, draft_updated_by, created_by)
    values ('landing', btrim(p_title), p_slug, p_document, (select auth.uid()), (select auth.uid()))
    returning * into p;
  exception when unique_violation then
    -- Duas criações simultâneas com o mesmo endereço.
    raise exception 'Já existe uma página com o endereço /lp/%. Escolha outro.', p_slug using errcode = 'P0001';
  end;
  return p;
end;
$$;

create or replace function public.duplicate_page(p_page_id uuid, p_title text, p_slug text)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.pages;
  p public.pages;
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem duplicar landing pages.' using errcode = '42501';
  end if;
  select * into source from public.pages where id = p_page_id and kind = 'landing';
  if not found then
    raise exception 'Página não encontrada.' using errcode = 'P0002';
  end if;
  perform public.assert_landing_meta(p_title, p_slug);

  begin
    -- A cópia nasce como rascunho, sem versão publicada.
    insert into public.pages (kind, title, slug, draft_document, draft_updated_by, created_by)
    values ('landing', btrim(p_title), p_slug, source.draft_document, (select auth.uid()), (select auth.uid()))
    returning * into p;
  exception when unique_violation then
    raise exception 'Já existe uma página com o endereço /lp/%. Escolha outro.', p_slug using errcode = 'P0001';
  end;
  return p;
end;
$$;

-- Renomeia e troca o endereço. Trocar o endereço de uma página no ar exige confirmação,
-- porque o endereço antigo deixa de existir.
create or replace function public.update_page_meta(
  p_page_id uuid,
  p_title text,
  p_slug text,
  p_confirm_slug_change boolean default false
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
    raise exception 'Apenas administradores podem alterar landing pages.' using errcode = '42501';
  end if;
  select * into p from public.pages where id = p_page_id and kind = 'landing' for update;
  if not found then
    raise exception 'Página não encontrada.' using errcode = 'P0002';
  end if;
  perform public.assert_landing_meta(p_title, p_slug, p_page_id);
  if p.status = 'published' and p.slug <> p_slug and not coalesce(p_confirm_slug_change, false) then
    raise exception 'Esta página está no ar. Confirme a troca de endereço: o endereço atual deixará de funcionar.'
      using errcode = 'P0001';
  end if;

  begin
    update public.pages set title = btrim(p_title), slug = p_slug where id = p_page_id returning * into p;
  exception when unique_violation then
    raise exception 'Já existe uma página com o endereço /lp/%. Escolha outro.', p_slug using errcode = 'P0001';
  end;
  return p;
end;
$$;

-- Tira do ar. A versão publicada continua guardada em page_versions.
create or replace function public.unpublish_page(p_page_id uuid)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pages;
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem despublicar landing pages.' using errcode = '42501';
  end if;
  update public.pages set status = 'unpublished'
  where id = p_page_id and kind = 'landing' and status = 'published'
  returning * into p;
  if not found then
    raise exception 'Página não encontrada ou não está publicada.' using errcode = 'P0002';
  end if;
  return p;
end;
$$;

create or replace function public.archive_page(p_page_id uuid)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pages;
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem arquivar landing pages.' using errcode = '42501';
  end if;
  update public.pages set status = 'archived', archived_at = now()
  where id = p_page_id and kind = 'landing' and status <> 'archived'
  returning * into p;
  if not found then
    raise exception 'Página não encontrada ou já arquivada.' using errcode = 'P0002';
  end if;
  return p;
end;
$$;

-- Restaura como rascunho: voltar ao ar exige publicar de novo.
create or replace function public.restore_page(p_page_id uuid)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pages;
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem restaurar landing pages.' using errcode = '42501';
  end if;
  update public.pages set status = 'draft', archived_at = null
  where id = p_page_id and kind = 'landing' and status = 'archived'
  returning * into p;
  if not found then
    raise exception 'Página não encontrada ou não está arquivada.' using errcode = 'P0002';
  end if;
  return p;
end;
$$;

-- Exclui a landing page e as versões publicadas dela. A Home nunca é excluída por aqui.
create or replace function public.delete_page(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem excluir landing pages.' using errcode = '42501';
  end if;
  delete from public.pages where id = p_page_id and kind = 'landing';
  if not found then
    raise exception 'Página não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

-- Lista para a tela "Minhas landing pages". Não devolve o documento (pode ter até 512 kB).
create or replace function public.list_landing_pages()
returns table (
  id uuid,
  title text,
  slug text,
  status text,
  draft_updated_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz,
  has_unpublished_changes boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(array['admin']::public.app_role[]) then
    raise exception 'Apenas administradores podem ver as landing pages.' using errcode = '42501';
  end if;
  return query
    select
      pg.id, pg.title, pg.slug, pg.status, pg.draft_updated_at, pg.published_at, pg.archived_at, pg.created_at,
      (pg.status = 'published' and pg.published_at is not null and pg.draft_updated_at > pg.published_at)
    from public.pages pg
    where pg.kind = 'landing'
    order by pg.draft_updated_at desc;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permissões: nada para visitantes; a checagem de administrador é feita dentro de cada função
-- -----------------------------------------------------------------------------
revoke execute on function public.assert_page_document(jsonb) from public, anon, authenticated;
revoke execute on function public.assert_landing_meta(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.ensure_home_page(jsonb) from public, anon;
revoke execute on function public.save_page_draft(uuid, jsonb, timestamptz) from public, anon;
revoke execute on function public.create_landing_page(text, text, jsonb) from public, anon;
revoke execute on function public.duplicate_page(uuid, text, text) from public, anon;
revoke execute on function public.update_page_meta(uuid, text, text, boolean) from public, anon;
revoke execute on function public.unpublish_page(uuid) from public, anon;
revoke execute on function public.archive_page(uuid) from public, anon;
revoke execute on function public.restore_page(uuid) from public, anon;
revoke execute on function public.delete_page(uuid) from public, anon;
revoke execute on function public.list_landing_pages() from public, anon;

grant execute on function public.ensure_home_page(jsonb) to authenticated;
grant execute on function public.save_page_draft(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.create_landing_page(text, text, jsonb) to authenticated;
grant execute on function public.duplicate_page(uuid, text, text) to authenticated;
grant execute on function public.update_page_meta(uuid, text, text, boolean) to authenticated;
grant execute on function public.unpublish_page(uuid) to authenticated;
grant execute on function public.archive_page(uuid) to authenticated;
grant execute on function public.restore_page(uuid) to authenticated;
grant execute on function public.delete_page(uuid) to authenticated;
grant execute on function public.list_landing_pages() to authenticated;
