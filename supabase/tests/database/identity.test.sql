-- Testes pgTAP da migração de identidade.
-- Executar com: npx supabase test db   (requer Supabase local com Docker, ou --linked)
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- ---------------------------------------------------------------------------
-- Estrutura
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'todas as tabelas do schema public têm RLS ativada'
);

-- ---------------------------------------------------------------------------
-- Dados de teste (só existem dentro desta transação)
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@teste.local', '{"full_name":"Ana Admin"}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendas@teste.local', '{}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'semperfil@teste.local', '{}');

select is((select count(*)::int from public.profiles), 3, 'gatilho cria um profile por usuário do Auth');
select is((select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Ana Admin', 'full_name vem do metadata do convite');

select lives_ok($$ select public.bootstrap_first_admin('ADMIN@teste.local') $$, 'bootstrap cria o primeiro admin (e-mail sem diferenciar maiúsculas)');
select throws_ok($$ select public.bootstrap_first_admin('vendas@teste.local') $$, 'P0001', null, 'bootstrap não roda duas vezes');

insert into public.user_roles (user_id, role) values ('22222222-2222-2222-2222-222222222222', 'sales');

-- ---------------------------------------------------------------------------
-- Operador comercial
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is(public.current_app_role(), 'sales'::public.app_role, 'operador recebe o perfil sales');
select is((select count(*)::int from public.user_roles), 1, 'operador vê apenas o próprio perfil de acesso');
select is((select count(*)::int from public.profiles), 3, 'membro da equipe vê os profiles (nomes de responsáveis)');
select throws_ok(
  $$ update public.user_roles set role = 'admin' where user_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'operador não consegue se promover'
);
select throws_ok(
  $$ update public.profiles set is_active = false where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'operador não altera is_active'
);
update public.profiles set full_name = 'Vendedor' where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Vendedor', 'usuário altera o próprio nome'
);
update public.profiles set full_name = 'Invasão' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Ana Admin', 'usuário não altera o nome de outra pessoa (RLS filtra a linha)'
);

-- ---------------------------------------------------------------------------
-- Usuário autenticado sem perfil de acesso
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is(public.current_app_role(), null, 'usuário sem perfil não tem papel');
select is((select count(*)::int from public.profiles), 1, 'usuário sem perfil vê apenas o próprio profile');

-- ---------------------------------------------------------------------------
-- Visitante anônimo
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anônimo não lê profiles');
select throws_ok($$ select public.current_app_role() $$, '42501', null, 'anônimo não executa funções de perfil');

-- ---------------------------------------------------------------------------
-- Último administrador
-- ---------------------------------------------------------------------------
reset role;
select throws_ok(
  $$ delete from public.user_roles where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001', null, 'não é possível remover o último administrador'
);

select * from finish();
rollback;
