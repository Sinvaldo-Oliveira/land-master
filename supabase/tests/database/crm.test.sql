-- Testes pgTAP da migração do CRM (contatos, funil, oportunidades).
-- Executar com: npx supabase test db   (requer Docker ou --linked; ainda NÃO executado neste ambiente)
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- ---------------------------------------------------------------------------
-- Estrutura: todas as tabelas do módulo com RLS
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables
   where schemaname = 'public'
     and tablename in ('lead_sources','lost_reasons','pipelines','pipeline_stages','contacts','deals','deal_events','activities','tasks')
     and rowsecurity),
  9,
  'as nove tabelas do CRM têm RLS ativada'
);

-- ---------------------------------------------------------------------------
-- Dados de teste (dentro desta transação)
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@teste.local', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendaA@teste.local', '{}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendaB@teste.local', '{}');

insert into public.user_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'sales'),
  ('33333333-3333-3333-3333-333333333333', 'sales');

-- Contato e oportunidade do operador A (criados como admin para isolar o teste)
set local role postgres;
insert into public.contacts (id, name, email, phone, owner_id)
values ('aaaaaaa1-0000-0000-0000-000000000001', 'Contato da Vendedora A', 'contato.a@teste.local', '(11) 90000-0001', '22222222-2222-2222-2222-222222222222');

insert into public.contacts (id, name, email, owner_id)
values ('aaaaaaa1-0000-0000-0000-000000000002', 'Contato do Vendedor B', 'contato.b@teste.local', '33333333-3333-3333-3333-333333333333');

-- ---------------------------------------------------------------------------
-- Operador A
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*)::int from public.contacts), 1, 'operador vê somente o próprio contato');
select throws_ok(
  $$ insert into public.contacts (name, owner_id) values ('Tentativa', '33333333-3333-3333-3333-333333333333') $$,
  '42501', null, 'operador não cria contato para outro responsável'
);

select lives_ok($$
  insert into public.deals (title, contact_id, pipeline_id, stage_id, owner_id, amount)
  select 'Site novo', 'aaaaaaa1-0000-0000-0000-000000000001', s.pipeline_id, s.id,
         '22222222-2222-2222-2222-222222222222', 1500
  from public.pipeline_stages s where s.name = 'Novo lead'
$$, 'operador cria oportunidade no próprio contato');

select is(
  (select lifecycle from public.contacts where id = 'aaaaaaa1-0000-0000-0000-000000000001'),
  'prospect', 'contato vira "em negociação" ao receber a primeira oportunidade'
);

select throws_ok(
  $$ update public.deals set stage_id = (select id from public.pipeline_stages where name = 'Negociação')
     where title = 'Site novo' $$,
  '42501', null, 'etapa não muda por UPDATE direto (somente move_deal)'
);

select lives_ok($$
  select public.move_deal(
    (select id from public.deals where title = 'Site novo'),
    (select id from public.pipeline_stages where name = 'Qualificação')
  )
$$, 'operador move a própria oportunidade pela RPC');

select is(
  (select s.name from public.deals d join public.pipeline_stages s on s.id = d.stage_id where d.title = 'Site novo'),
  'Qualificação', 'etapa atualizada pela RPC move_deal'
);

select throws_ok(
  $$ select public.close_deal_lost((select id from public.deals where title = 'Site novo'), '00000000-0000-0000-0000-000000000000', null) $$,
  'P0001', null, 'perda exige motivo válido'
);

select lives_ok($$
  select public.close_deal_won((select id from public.deals where title = 'Site novo'))
$$, 'operador fecha a venda');

select is(
  (select lifecycle from public.contacts where id = 'aaaaaaa1-0000-0000-0000-000000000001'),
  'customer', 'venda concluída converte o contato em cliente'
);

select throws_ok(
  $$ select public.reopen_deal((select id from public.deals where title = 'Site novo')) $$,
  '42501', null, 'operador não reabre oportunidade'
);

select throws_ok(
  $$ delete from public.contacts where id = 'aaaaaaa1-0000-0000-0000-000000000001' $$,
  '42501', null, 'contato não é apagado fisicamente'
);

select is(
  (select count(*)::int from public.find_duplicate_contacts('contato.b@teste.local', null)),
  0, 'aviso de duplicidade não revela contato de outro responsável'
);

-- ---------------------------------------------------------------------------
-- Operador B
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select is((select count(*)::int from public.deals), 0, 'operador B não vê oportunidades do operador A');
select throws_ok(
  $$ select public.move_deal((select id from public.deals where title = 'Site novo'),
       (select id from public.pipeline_stages where name = 'Negociação')) $$,
  '42501', null, 'operador B não move oportunidade de outro'
);

-- ---------------------------------------------------------------------------
-- Gestor/administrador
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.find_duplicate_contacts('CONTATO.A@teste.local', null)),
  1, 'admin encontra duplicidade por e-mail sem diferenciar maiúsculas'
);

select lives_ok($$
  select public.reopen_deal((select id from public.deals where title = 'Site novo'))
$$, 'admin reabre oportunidade ganha');

-- ---------------------------------------------------------------------------
-- Regras de criação e configuração
-- ---------------------------------------------------------------------------
select throws_ok($$
  insert into public.deals (title, contact_id, pipeline_id, stage_id, owner_id)
  select 'Direto na venda', 'aaaaaaa1-0000-0000-0000-000000000002', s.pipeline_id, s.id,
         '33333333-3333-3333-3333-333333333333'
  from public.pipeline_stages s where s.name = 'Venda concluída'
$$, 'P0001', null, 'oportunidade nova não nasce na etapa de venda concluída');

select lives_ok($$
  insert into public.pipelines (name, position) values ('Pós-venda', 2)
$$, 'admin cria um funil');

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ insert into public.pipelines (name, position) values ('Tentativa', 3) $$,
  '42501', null, 'operador não cria funis'
);

-- ---------------------------------------------------------------------------
-- Anônimo
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok(
  $$ select count(*) from public.contacts $$,
  '42501', null, 'visitante anônimo não lê contatos'
);
select throws_ok(
  $$ select count(*) from public.deals $$,
  '42501', null, 'visitante anônimo não lê oportunidades'
);

-- ---------------------------------------------------------------------------
-- Histórico
-- ---------------------------------------------------------------------------
reset role;
select ok(
  (select count(*) from public.deal_events e
   join public.deals d on d.id = e.deal_id
   where d.title = 'Site novo' and e.type = 'created') = 1,
  'criação da oportunidade gera evento no histórico'
);

select * from finish();
rollback;
