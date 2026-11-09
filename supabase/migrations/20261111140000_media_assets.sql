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
