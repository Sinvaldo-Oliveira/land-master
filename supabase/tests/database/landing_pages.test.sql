-- Testes pgTAP do gerenciamento de landing pages (Etapa 1 do construtor).
-- Executar com: npx supabase test db   (requer Docker ou --linked; ainda NÃO executado neste ambiente)
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@teste.local', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gestor@teste.local', '{}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendas@teste.local', '{}');
insert into public.user_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'manager'),
  ('33333333-3333-3333-3333-333333333333', 'sales');

-- Visitante anônimo não executa nada do gerenciamento
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select * from public.list_landing_pages() $$, '42501', null, 'anônimo não lista landing pages');
select throws_ok(
  $$ select public.create_landing_page('Página', 'pagina', '{"schemaVersion":2,"theme":{},"blocks":[]}'::jsonb) $$,
  '42501', null, 'anônimo não cria landing page'
);

-- Gestor e operador comercial são recusados mesmo chamando a função direto
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok($$ select * from public.list_landing_pages() $$, '42501', null, 'gestor não lista pelo gerenciamento');
select throws_ok(
  $$ select public.create_landing_page('Página', 'pagina', '{"schemaVersion":2,"theme":{},"blocks":[]}'::jsonb) $$,
  '42501', null, 'gestor não cria landing page'
);
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select throws_ok(
  $$ select public.create_landing_page('Página', 'pagina', '{"schemaVersion":2,"theme":{},"blocks":[]}'::jsonb) $$,
  '42501', null, 'operador comercial não cria landing page'
);

-- Administrador
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ select public.create_landing_page('  Black Friday  ', 'black-friday', '{"schemaVersion":2,"theme":{},"blocks":[]}'::jsonb) $$,
  'admin cria uma landing page em branco'
);
select is(
  (select title || '|' || status from public.pages where slug = 'black-friday'),
  'Black Friday|draft', 'a página nasce como rascunho, com o nome sem espaços nas pontas'
);
select throws_ok(
  $$ select public.create_landing_page('Outra', 'black-friday', '{"schemaVersion":2,"theme":{},"blocks":[]}'::jsonb) $$,
  'P0001', 'Já existe uma página com o endereço /lp/black-friday. Escolha outro.', 'endereço repetido é recusado com mensagem clara'
);
select throws_ok(
  $$ select public.create_landing_page('Outra', 'Black Friday', '{"schemaVersion":2,"theme":{},"blocks":[]}'::jsonb) $$,
  'P0001', null, 'endereço fora do formato é recusado'
);
select throws_ok(
  $$ select public.create_landing_page('Outra', 'outra', '{"schemaVersion":1,"theme":{},"sections":[]}'::jsonb) $$,
  'P0001', null, 'landing page não aceita documento v1'
);
select throws_ok(
  $$ select public.create_landing_page('Outra', 'outra', '{"schemaVersion":2,"theme":{},"blocks":[{"type":"hero"}]}'::jsonb) $$,
  'P0001', null, 'bloco sem id é recusado'
);
select throws_ok(
  $$ select public.create_landing_page('Outra', 'outra', jsonb_build_object('schemaVersion', 2, 'theme', '{}'::jsonb, 'blocks',
       (select jsonb_agg(jsonb_build_object('id', 'b' || n, 'type', 'faq')) from generate_series(1, 201) n))) $$,
  'P0001', 'A página passou do limite de 200 blocos.', 'mais de 200 blocos é recusado'
);
select throws_ok(
  $$ select public.create_landing_page('Outra', 'outra',
       '{"schemaVersion":2,"theme":{},"blocks":[{"id":"1","type":"x","children":[{"id":"2","type":"x","children":[{"id":"3","type":"x","children":[{"id":"4","type":"x","children":[{"id":"5","type":"x"}]}]}]}]}]}'::jsonb) $$,
  'P0001', 'A página passou do limite de 4 níveis de blocos.', 'árvore com 5 níveis é recusada'
);
select throws_ok(
  $$ select public.save_page_draft((select id from public.pages where slug = 'black-friday'), '{"schemaVersion":1,"theme":{},"sections":[]}'::jsonb) $$,
  'P0001', null, 'rascunho de landing page não aceita documento v1'
);

-- Duplicar
select lives_ok(
  $$ select public.duplicate_page((select id from public.pages where slug = 'black-friday'), 'Cópia', 'black-friday-copia') $$,
  'admin duplica a página'
);
select is(
  (select status from public.pages where slug = 'black-friday-copia'), 'draft', 'a cópia nasce como rascunho'
);

-- Renomear e trocar endereço; página no ar exige confirmação
select lives_ok(
  $$ select public.update_page_meta((select id from public.pages where slug = 'black-friday'), 'Black Friday 2026', 'black-friday') $$,
  'admin renomeia a página'
);
select lives_ok($$ select public.publish_page((select id from public.pages where slug = 'black-friday')) $$, 'admin publica a landing page');
select throws_ok(
  $$ select public.update_page_meta((select id from public.pages where slug = 'black-friday'), 'Black Friday 2026', 'bf-2026') $$,
  'P0001', null, 'trocar o endereço de página no ar sem confirmação é recusado'
);
select lives_ok(
  $$ select public.update_page_meta((select id from public.pages where slug = 'black-friday'), 'Black Friday 2026', 'bf-2026', true) $$,
  'com confirmação, o endereço da página no ar é trocado'
);

-- Arquivar, restaurar e excluir
select is(
  (select status from public.archive_page((select id from public.pages where slug = 'bf-2026'))), 'archived', 'arquivar tira a página do ar'
);
select is(
  (select status from public.restore_page((select id from public.pages where slug = 'bf-2026'))), 'draft', 'restaurar devolve como rascunho'
);
select lives_ok($$ select public.delete_page((select id from public.pages where slug = 'bf-2026')) $$, 'admin exclui a landing page');
select is(
  (select count(*)::int from public.page_versions v where not exists (select 1 from public.pages p where p.id = v.page_id)),
  0, 'as versões publicadas da página excluída também saem'
);

select * from finish();
rollback;
