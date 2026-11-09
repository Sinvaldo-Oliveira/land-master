-- Rode no SQL Editor do projeto landin-master (uma vez).
-- Cria o bucket site-media e a tabela media_assets.

-- =============================================================================
-- Fase 4 — Imagens do site (bucket public "site-media")
-- Ver docs/MODELO_BANCO_DADOS.md §7.
-- Leitura: pela URL pública do bucket (não há política de SELECT, então o
--          visitante não consegue listar os arquivos).
-- Escrita: somente administradores, e somente neste bucket.
-- Caminho dos arquivos: aaaa/mm/<uuid>.<extensão>.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy site_media_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-media'
    and (select public.has_role(array['admin']::public.app_role[]))
  );

create policy site_media_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'site-media'
    and (select public.has_role(array['admin']::public.app_role[]))
  )
  with check (
    bucket_id = 'site-media'
    and (select public.has_role(array['admin']::public.app_role[]))
  );

create policy site_media_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'site-media'
    and (select public.has_role(array['admin']::public.app_role[]))
  );

-- =============================================================================
-- Fase 4 — Registro das imagens enviadas (tabela media_assets)
-- Ver docs/MODELO_BANCO_DADOS.md §4.4.
-- Cada upload gera uma linha: caminho no bucket, tipo, tamanho e dimensões.
-- Leitura: administrador e gestor. Escrita: somente administrador, somente no
-- bucket do site, sempre em nome de quem enviou. Sem UPDATE/DELETE pelo cliente.
-- =============================================================================

create table public.media_assets (
  id           uuid primary key default gen_random_uuid(),
  bucket       text not null check (bucket = 'site-media'),
  path         text not null unique check (char_length(path) between 1 and 300),
  mime         text not null check (mime = 'image/webp'),
  size_bytes   int not null check (size_bytes > 0 and size_bytes <= 5242880),
  width        int check (width is null or width > 0),
  height       int check (height is null or height > 0),
  alt          text check (alt is null or char_length(alt) <= 160),
  uploaded_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);

comment on table public.media_assets is 'Imagens enviadas ao site. Todas são convertidas para WebP antes de gravar.';

create index media_assets_uploaded_by_idx on public.media_assets (uploaded_by);
create index media_assets_created_at_idx on public.media_assets (created_at desc);

alter table public.media_assets enable row level security;

revoke all on table public.media_assets from anon, authenticated;
grant select, insert on table public.media_assets to authenticated;

create policy media_assets_select on public.media_assets
  for select to authenticated
  using ((select public.has_role(array['admin', 'manager']::public.app_role[])));

create policy media_assets_insert on public.media_assets
  for insert to authenticated
  with check (
    (select public.has_role(array['admin']::public.app_role[]))
    and uploaded_by = (select auth.uid())
  );
