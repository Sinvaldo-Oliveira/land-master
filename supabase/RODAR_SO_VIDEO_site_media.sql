-- Rode no SQL Editor do projeto landin-master (uma vez).
-- Libera vídeos MP4/WebM (até 5 MB) para o clipe do hero interativo.
-- Pode rodar de novo sem problema.

-- =============================================================================
-- Fase 4 — Vídeos curtos no bucket do site (clipe do hero interativo)
-- Libera MP4 e WebM no bucket site-media (limite continua 5 MB) e no registro
-- media_assets. Imagens continuam sendo gravadas só como WebP.
-- Não apaga dados: só troca a lista de tipos aceitos.
-- =============================================================================

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
where id = 'site-media';

alter table public.media_assets drop constraint if exists media_assets_mime_check;
alter table public.media_assets
  add constraint media_assets_mime_check check (mime in ('image/webp', 'video/mp4', 'video/webm'));
