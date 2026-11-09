-- Testes pgTAP do bucket de imagens do site.
-- Executar com: npx supabase test db   (requer Docker ou --linked; ainda NÃO executado neste ambiente)
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@teste.local', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendas@teste.local', '{}');
insert into public.user_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'sales');

select is(
  (select file_size_limit from storage.buckets where id = 'site-media'),
  5242880::bigint, 'bucket site-media limita arquivos a 5 MB'
);
select ok(
  (select allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[] and not ('image/svg+xml' = any(allowed_mime_types))
   from storage.buckets where id = 'site-media'),
  'bucket aceita só JPEG, PNG, WebP e AVIF (SVG bloqueado)'
);

-- Visitante anônimo não envia
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('site-media', '2026/11/anonimo.png') $$,
  '42501', null, 'visitante anônimo não envia imagens'
);

-- Operador comercial não envia
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('site-media', '2026/11/vendas.png') $$,
  '42501', null, 'operador comercial não envia imagens do site'
);

-- Administrador envia
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('site-media', '2026/11/admin.png') $$,
  'administrador envia imagem para o bucket do site'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('outro-bucket', '2026/11/x.png') $$,
  '42501', null, 'política vale só para o bucket do site'
);

select * from finish();
rollback;
