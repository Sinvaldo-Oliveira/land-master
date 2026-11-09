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
