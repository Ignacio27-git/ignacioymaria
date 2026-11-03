-- couple-auth: person mapping, signup hook and score ownership (ROADMAP 1.4).
-- Fixtures use fake *.example.test addresses only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(64);

-- CA-1: shape of the person column.
select col_not_null('public', 'allowed_emails', 'person',
  'CA-1.4 person is NOT NULL');
select col_type_is('public', 'allowed_emails', 'person', 'text',
  'CA-1.4 person is text');

-- Empty allowlist: current_person() and the hook never error (CA-1.3, CA-2.4).
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select is(public.current_person(), null,
  'CA-1.3 empty allowlist -> null person');
reset role;

select is(
  public.before_user_created_hook('{"user":{"email":"ana@example.test"}}'::jsonb)
    -> 'error' ->> 'http_code',
  '403',
  'CA-2.4 empty allowlist -> 403 error object'
);

-- Fixtures (as owner): ana is ignacio, ben is maria.
select lives_ok(
  $$insert into public.allowed_emails (email, person)
    values ('ana@example.test', 'ignacio'), ('ben@example.test', 'maria')$$,
  'CA-1.1 fixtures with person accepted'
);

-- CA-1.4: uniqueness, allowed values and not-null.
select throws_ok(
  $$insert into public.allowed_emails (email, person) values ('cat@example.test', 'maria')$$,
  '23505', null, 'CA-1.4 duplicate person rejected'
);
select throws_ok(
  $$insert into public.allowed_emails (email, person) values ('cat@example.test', 'bob')$$,
  '23514', null, 'CA-1.4 unknown person rejected'
);
select throws_ok(
  $$insert into public.allowed_emails (email, person) values ('cat@example.test', null)$$,
  '23502', null, 'CA-1.4 null person rejected'
);

-- CA-1.5: current_person() metadata.
select is(
  (select prosecdef from pg_proc where oid = 'public.current_person()'::regprocedure),
  true,
  'CA-1.5 current_person is security definer'
);
select is(
  (select proconfig from pg_proc where oid = 'public.current_person()'::regprocedure),
  array['search_path=""'],
  'CA-1.5 current_person pins an empty search_path'
);
select is(
  has_function_privilege('anon', 'public.current_person()', 'execute'),
  false,
  'CA-1.5 anon cannot execute current_person'
);
select is(
  has_function_privilege('authenticated', 'public.current_person()', 'execute'),
  true,
  'CA-1.5 authenticated can execute current_person'
);

-- CA-1.1 .. CA-1.3: current_person() as an authenticated session.
set local role authenticated;

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select is(public.current_person(), 'ignacio', 'CA-1.1 ana -> ignacio');

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ben@example.test"}', true);
select is(public.current_person(), 'maria', 'CA-1.1 ben -> maria');

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ANA@Example.Test"}', true);
select is(public.current_person(), 'ignacio', 'CA-1.2 mixed-case claim -> ignacio');

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"eve@example.test"}', true);
select is(public.current_person(), null, 'CA-1.3 unlisted email -> null');

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select is(public.current_person(), null, 'CA-1.3 claims without email -> null');

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":null}', true);
select is(public.current_person(), null, 'CA-1.3 null email claim -> null');

select set_config('request.jwt.claims', '', true);
select is(public.current_person(), null, 'CA-1.3 missing claims -> null');

reset role;

-- CA-2: the signup hook. The pgTAP runner connects as postgres, which is not a
-- superuser and cannot SET ROLE supabase_auth_admin (role memberships of that
-- role are reserved), so the hook is called as its owner and the privileges
-- are asserted from the catalog. The end-to-end path as supabase_auth_admin is
-- covered by the Playwright suite against the real GoTrue.
select is(
  (select prosecdef from pg_proc
    where oid = 'public.before_user_created_hook(jsonb)'::regprocedure),
  false,
  'CA-2 hook is security invoker'
);


select is(
  public.before_user_created_hook('{"user":{"email":"ana@example.test"}}'::jsonb),
  '{}'::jsonb,
  'CA-2.1 allowlisted email -> {}'
);
select is(
  public.before_user_created_hook('{"user":{"email":"A@Example.TEST"}}'::jsonb)
    -> 'error' ->> 'http_code',
  '403',
  'CA-2.2 unknown address in mixed case is still rejected'
);
select is(
  public.before_user_created_hook('{"user":{"email":"Ben@Example.Test"}}'::jsonb),
  '{}'::jsonb,
  'CA-2.2 mixed-case allowlisted email -> {}'
);
select is(
  public.before_user_created_hook('{"user":{"email":"cat@example.test"}}'::jsonb)
    -> 'error' ->> 'http_code',
  '403',
  'CA-2.3 unlisted email -> http_code 403'
);
select ok(
  length(public.before_user_created_hook('{"user":{"email":"cat@example.test"}}'::jsonb)
    -> 'error' ->> 'message') > 0,
  'CA-2.3 unlisted email -> non-empty message'
);
select is(
  public.before_user_created_hook('{"user":{}}'::jsonb) -> 'error' ->> 'http_code',
  '403',
  'CA-2.4 event without email -> 403'
);
select is(
  public.before_user_created_hook('{"user":{"email":null}}'::jsonb)
    -> 'error' ->> 'http_code',
  '403',
  'CA-2.4 null email -> 403'
);
select is(
  public.before_user_created_hook('{"user":{"email":""}}'::jsonb)
    -> 'error' ->> 'http_code',
  '403',
  'CA-2.4 empty email -> 403'
);
select is(
  public.before_user_created_hook('{}'::jsonb) -> 'error' ->> 'http_code',
  '403',
  'CA-2.4 event without user -> 403'
);

reset role;

-- CA-2.6: privileges.
select is(
  has_function_privilege('supabase_auth_admin',
    'public.before_user_created_hook(jsonb)', 'execute'),
  true,
  'CA-2.6 supabase_auth_admin can execute the hook'
);
select is(
  has_function_privilege('authenticated',
    'public.before_user_created_hook(jsonb)', 'execute'),
  false,
  'CA-2.6 authenticated cannot execute the hook'
);
select is(
  has_function_privilege('anon',
    'public.before_user_created_hook(jsonb)', 'execute'),
  false,
  'CA-2.6 anon cannot execute the hook'
);
select is_empty(
  $$select 1
    from pg_proc p, aclexplode(p.proacl) a
    where p.oid = 'public.before_user_created_hook(jsonb)'::regprocedure
      and a.grantee = 0 and a.privilege_type = 'EXECUTE'$$,
  'CA-2.6 public cannot execute the hook'
);
select is(
  has_table_privilege('anon', 'public.allowed_emails', 'select,insert,update,delete'),
  false,
  'CA-2.6 anon still holds no privilege on allowed_emails'
);
select is(
  has_table_privilege('authenticated', 'public.allowed_emails', 'select,insert,update,delete'),
  false,
  'CA-2.6 authenticated still holds no privilege on allowed_emails'
);
select is(
  has_table_privilege('supabase_auth_admin', 'public.allowed_emails', 'select'),
  true,
  'CA-2.6 supabase_auth_admin can read allowed_emails'
);

-- TS-10: score ownership trigger.
select has_trigger('public', 'titles', 'titles_enforce_score_ownership',
  'TS-10 trigger exists on titles');

insert into public.titles (id, name, kind)
values ('00000000-0000-0000-0000-0000000000d1', 'Film', 'movie');
insert into public.titles (id, name, kind, score_ignacio)
values ('00000000-0000-0000-0000-0000000000d2', 'Seven', 'movie', 7);

-- ana is ignacio.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);

select lives_ok(
  $$update public.titles set score_ignacio = 8.5
    where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'TS-10.1 ignacio sets his own score'
);
select is(
  (select score_ignacio from public.titles
    where id = '00000000-0000-0000-0000-0000000000d1'),
  8.5::numeric,
  'TS-10.1 own score reads back'
);

select throws_ok(
  $$update public.titles set score_maria = 9
    where id = '00000000-0000-0000-0000-0000000000d1'$$,
  '42501', null, 'TS-10.2 ignacio cannot set the other score'
);
select is(
  (select score_maria from public.titles
    where id = '00000000-0000-0000-0000-0000000000d1'),
  null,
  'TS-10.2 other score unchanged'
);

select lives_ok(
  $$update public.titles set score_maria = score_maria
    where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'TS-10.8 null to null on the other score is allowed'
);

select throws_ok(
  $$update public.titles set score_ignacio = 1, score_maria = 2
    where id = '00000000-0000-0000-0000-0000000000d1'$$,
  '42501', null, 'TS-10.6 a statement setting both scores is rejected'
);
select is(
  (select score_ignacio from public.titles
    where id = '00000000-0000-0000-0000-0000000000d1'),
  8.5::numeric,
  'TS-10.6 own score unchanged after the rejected statement'
);

select lives_ok(
  $$update public.titles set score_ignacio = null
    where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'TS-10.7 ignacio clears his own score'
);
select is(
  (select score_ignacio from public.titles
    where id = '00000000-0000-0000-0000-0000000000d1'),
  null,
  'TS-10.7 cleared score reads back null'
);

select lives_ok(
  $$insert into public.titles (id, name, kind, score_ignacio)
    values ('00000000-0000-0000-0000-0000000000d3', 'Ana pick', 'movie', 6)$$,
  'TS-10.5 ignacio inserts with his own score'
);
select throws_ok(
  $$insert into public.titles (name, kind, score_maria)
    values ('Forged', 'movie', 6)$$,
  '42501', null, 'TS-10.5 ignacio cannot insert the other score'
);

-- ben is maria.
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ben@example.test"}', true);

select throws_ok(
  $$update public.titles set score_ignacio = 1
    where id = '00000000-0000-0000-0000-0000000000d2'$$,
  '42501', null, 'TS-10.3 maria cannot change score_ignacio'
);
select is(
  (select score_ignacio from public.titles
    where id = '00000000-0000-0000-0000-0000000000d2'),
  7::numeric,
  'TS-10.3 score_ignacio unchanged'
);

select lives_ok(
  $$update public.titles set score_maria = 9
    where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'TS-10.3 maria sets her own score'
);
select is(
  (select score_maria from public.titles
    where id = '00000000-0000-0000-0000-0000000000d2'),
  9::numeric,
  'TS-10.3 own score reads back'
);

select lives_ok(
  $$update public.titles
    set name = 'Seven (b)', state = 'watched', observations = 'great'
    where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'TS-10.4 maria edits non-score columns'
);
select is(
  (select score_ignacio from public.titles
    where id = '00000000-0000-0000-0000-0000000000d2'),
  7::numeric,
  'TS-10.4 score_ignacio stays 7'
);

select lives_ok(
  $$update public.titles set score_ignacio = 7
    where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'TS-10.8 maria writes the value score_ignacio already has'
);

-- ana again: the other person's existing value cannot change.
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select throws_ok(
  $$update public.titles set score_maria = 3
    where id = '00000000-0000-0000-0000-0000000000d2'$$,
  '42501', null, 'TS-10.2 ignacio cannot overwrite an existing score_maria'
);
select is(
  (select score_maria from public.titles
    where id = '00000000-0000-0000-0000-0000000000d2'),
  9::numeric,
  'TS-10.2 existing score_maria unchanged'
);

reset role;

-- The owner role (migrations, the 1.7 import) is not restricted, even when
-- the session still carries a person's JWT claims.
select lives_ok(
  $$update public.titles set score_maria = 1, score_ignacio = 2
    where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'TS-10 postgres may update both scores'
);
select lives_ok(
  $$insert into public.titles (name, kind, score_ignacio, score_maria)
    values ('Imported', 'movie', 5, 6)$$,
  'TS-10 postgres may insert both scores'
);

-- TS-10.9 / CA-1.6: removal from the allowlist takes effect immediately.
delete from public.allowed_emails where email = 'ana@example.test';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select is(public.current_person(), null, 'CA-1.6 removed user has no person');
select is(public.is_allowed(), false, 'CA-1.6 removed user is not allowed');
select is_empty(
  $$with u as (
      update public.titles set name = 'After removal' returning id
    ) select * from u$$,
  'TS-10.9 removed user update affects 0 rows'
);
select throws_ok(
  $$insert into public.titles (name, kind) values ('After removal', 'movie')$$,
  '42501', null, 'TS-10.9 removed user cannot insert'
);
reset role;
select is(
  (select count(*)::integer from public.titles where name = 'After removal'),
  0,
  'TS-10.9 data unchanged after the rejected writes'
);

select * from finish();
rollback;
