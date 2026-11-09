-- Testes pgTAP das páginas do site (Home: rascunho e publicação).
-- Executar com: npx supabase test db   (requer Docker ou --linked)
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@teste.local', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gestor@teste.local', '{}');
insert into public.user_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'manager');

-- Anônimo antes de qualquer publicação
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((public.get_public_site() -> 'home'), 'null'::jsonb, 'sem Home publicada o site público recebe null');
select throws_ok($$ select count(*) from public.pages $$, '42501', null, 'anônimo não lê a tabela de páginas (rascunhos)');

-- Gestor não edita
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ select public.ensure_home_page('{"schemaVersion":1,"theme":{},"sections":[]}'::jsonb) $$,
  '42501', null, 'gestor não cria nem edita a Home'
);

-- Administrador
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$ select public.ensure_home_page('{"schemaVersion":2,"theme":{},"sections":[]}'::jsonb) $$,
  'P0001', null, 'documento com versão desconhecida é recusado'
);
select lives_ok(
  $$ select public.ensure_home_page('{"schemaVersion":1,"theme":{},"sections":[{"id":"a","type":"hero","title":"Versão 1"}]}'::jsonb) $$,
  'admin cria a Home a partir do template'
);
select is(
  (select (public.ensure_home_page('{"schemaVersion":1,"theme":{},"sections":[]}'::jsonb)).draft_document -> 'sections' -> 0 ->> 'title'),
  'Versão 1', 'ensure_home_page não sobrescreve uma Home existente'
);
select lives_ok(
  $$ select public.publish_page((select id from public.pages where kind = 'home')) $$,
  'admin publica a Home'
);
select lives_ok(
  $$ select public.save_page_draft((select id from public.pages where kind = 'home'),
       '{"schemaVersion":1,"theme":{},"sections":[{"id":"a","type":"hero","title":"Rascunho 2"}]}'::jsonb) $$,
  'admin salva um novo rascunho'
);
select throws_ok(
  $$ select public.save_page_draft((select id from public.pages where kind = 'home'),
       '{"schemaVersion":1,"theme":{},"sections":[]}'::jsonb, '2000-01-01T00:00:00Z'::timestamptz) $$,
  'P0001', null, 'rascunho alterado em outra sessão não é sobrescrito'
);
select throws_ok(
  $$ update public.page_versions set document = '{}'::jsonb $$,
  '42501', null, 'versões publicadas são imutáveis para o painel'
);

-- Gestor lê (somente leitura)
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*)::int from public.pages), 1, 'gestor lê a página no painel');

-- Anônimo vê só o que foi publicado
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(
  public.get_public_site() -> 'home' -> 'sections' -> 0 ->> 'title',
  'Versão 1', 'site público mostra a versão publicada, não o rascunho'
);
select throws_ok(
  $$ select public.save_page_draft(gen_random_uuid(), '{}'::jsonb) $$,
  '42501', null, 'anônimo não executa funções de edição'
);

select * from finish();
rollback;
