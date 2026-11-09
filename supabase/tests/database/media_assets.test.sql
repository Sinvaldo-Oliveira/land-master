-- Testes pgTAP da tabela media_assets (imagens enviadas ao site).
-- Executar com: npx supabase test db   (requer Docker ou --linked; ainda NÃO executado neste ambiente)
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@teste.local', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendas@teste.local', '{}');
insert into public.user_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'sales');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select count(*) from public.media_assets $$, '42501', null, 'visitante anônimo não lê o registro de imagens');

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ insert into public.media_assets (bucket, path, mime, size_bytes) values ('site-media', '2026/11/v.webp', 'image/webp', 1000) $$,
  '42501', null, 'operador comercial não registra imagens do site'
);

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ insert into public.media_assets (bucket, path, mime, size_bytes, width, height) values ('site-media', '2026/11/a.webp', 'image/webp', 1000, 64, 48) $$,
  'administrador registra a imagem enviada'
);
select throws_ok(
  $$ insert into public.media_assets (bucket, path, mime, size_bytes) values ('site-media', '2026/11/png.webp', 'image/png', 1000) $$,
  '23514', null, 'só WebP é aceito no registro'
);

select * from finish();
rollback;
