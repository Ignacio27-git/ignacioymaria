-- Access control: allowed_emails, is_allowed(), privileges (part A).
-- Fixtures use fake *.example.test addresses only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(32);

-- AC-1.2: no rows come from migrations (fresh reset leaves the table empty).
select is_empty(
  'select * from public.allowed_emails',
  'AC-1.2 allowed_emails is empty after migrations'
);

-- AC-1.1: the check rejects uppercase and blank values, accepts lowercase.
select throws_ok(
  $$insert into public.allowed_emails (email) values ('Foo@X.example.test')$$,
  '23514', null, 'AC-1.1 uppercase email rejected'
);
select throws_ok(
  $$insert into public.allowed_emails (email) values ('   ')$$,
  '23514', null, 'AC-1.1 spaces-only email rejected'
);
select throws_ok(
  $$insert into public.allowed_emails (email) values (E'\t\n')$$,
  '23514', null, 'AC-1.1 tab/newline-only email rejected'
);
select throws_ok(
  $$insert into public.allowed_emails (email) values ('')$$,
  '23514', null, 'AC-1.1 empty email rejected'
);

-- AC-2.5: function metadata.
select is(
  (select prosecdef from pg_proc where oid = 'public.is_allowed()'::regprocedure),
  true,
  'AC-2.5 is_allowed is security definer'
);
select is(
  (select proconfig from pg_proc where oid = 'public.is_allowed()'::regprocedure),
  array['search_path=""'],
  'AC-2.5 is_allowed pins an empty search_path'
);
select is(
  has_function_privilege('anon', 'public.is_allowed()', 'execute'),
  false,
  'AC-2.5 anon cannot execute is_allowed'
);
select is(
  has_function_privilege('authenticated', 'public.is_allowed()', 'execute'),
  true,
  'AC-2.5 authenticated can execute is_allowed'
);

-- AC-2.4: empty allowlist -> false, never an error.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select is(public.is_allowed(), false, 'AC-2.4 empty allowlist -> false');
reset role;

-- Fixture rows (as owner).
select lives_ok(
  $$insert into public.allowed_emails (email) values ('ana@example.test'), ('ben@example.test')$$,
  'AC-1.1 lowercase emails accepted'
);

-- AC-2.1 .. AC-2.4 as an authenticated session.
set local role authenticated;

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select is(public.is_allowed(), true, 'AC-2.1 listed email -> true');

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ANA@Example.Test"}', true);
select is(public.is_allowed(), true, 'AC-2.2 mixed-case claim -> true');

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"eve@example.test"}', true);
select is(public.is_allowed(), false, 'AC-2.3 unlisted email -> false');

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select is(public.is_allowed(), false, 'AC-2.4 claims without email -> false');

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":null}', true);
select is(public.is_allowed(), false, 'AC-2.4 null email claim -> false');

select set_config('request.jwt.claims', '', true);
select is(public.is_allowed(), false, 'AC-2.4 missing claims -> false');

-- AC-4.1 / AC-4.2: allowlisted authenticated user cannot touch the table.
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select throws_ok(
  'select * from public.allowed_emails', '42501', null,
  'AC-4.1 authenticated cannot select allowed_emails'
);
select throws_ok(
  $$insert into public.allowed_emails (email) values ('eve@example.test')$$,
  '42501', null, 'AC-4.2 authenticated cannot insert'
);
select throws_ok(
  $$update public.allowed_emails set email = 'eve@example.test'$$,
  '42501', null, 'AC-4.2 authenticated cannot update'
);
select throws_ok(
  'delete from public.allowed_emails', '42501', null,
  'AC-4.2 authenticated cannot delete'
);

-- AC-4.4: the definer function still works for that user.
select is(public.is_allowed(), true, 'AC-4.4 is_allowed still true for allowlisted user');

reset role;

-- AC-4.1 / AC-4.2 / AC-2.5 as anon.
set local role anon;
select throws_ok(
  'select * from public.allowed_emails', '42501', null,
  'AC-4.1 anon cannot select allowed_emails'
);
select throws_ok(
  $$insert into public.allowed_emails (email) values ('eve@example.test')$$,
  '42501', null, 'AC-4.2 anon cannot insert'
);
select throws_ok(
  $$update public.allowed_emails set email = 'eve@example.test'$$,
  '42501', null, 'AC-4.2 anon cannot update'
);
select throws_ok(
  'delete from public.allowed_emails', '42501', null,
  'AC-4.2 anon cannot delete'
);
select throws_ok(
  'select public.is_allowed()', '42501', null,
  'AC-2.5 anon calling is_allowed is denied'
);
reset role;

-- AC-4.2: the table is unchanged after the denied writes.
select results_eq(
  'select email from public.allowed_emails order by email',
  $$values ('ana@example.test'::text), ('ben@example.test'::text)$$,
  'AC-4.2 allowed_emails unchanged after denied writes'
);

-- AC-4.3: RLS enabled, no client policies.
select is(
  (select relrowsecurity from pg_class where oid = 'public.allowed_emails'::regclass),
  true,
  'AC-4.3 allowed_emails has RLS enabled'
);
select is_empty(
  $$select * from pg_policies where schemaname = 'public' and tablename = 'allowed_emails'$$,
  'AC-4.3 allowed_emails has no policies'
);

-- Grants: neither client role holds any privilege.
select is(
  has_table_privilege('anon', 'public.allowed_emails', 'select,insert,update,delete'),
  false,
  'AC-4.1 anon holds no table privilege'
);
select is(
  has_table_privilege('authenticated', 'public.allowed_emails', 'select,insert,update,delete'),
  false,
  'AC-4.1 authenticated holds no table privilege'
);

select * from finish();
rollback;
