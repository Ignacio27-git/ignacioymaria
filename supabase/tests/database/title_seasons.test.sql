-- title_seasons (ROADMAP 1.8): shape, checks, series-only FK, cascade, RLS
-- and score ownership. Fixtures use fake *.example.test addresses only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(42);

-- S22 / R3.6: the migration creates no season rows and touches no title.
select has_table('public', 'title_seasons', 'S1 title_seasons exists');
select is_empty(
  'select * from public.title_seasons',
  'S22 no season rows exist after the migration (no backfill)'
);

-- Fixtures (as owner).
insert into public.allowed_emails (email, person)
values ('ana@example.test', 'ignacio'), ('ben@example.test', 'maria');
insert into public.titles (id, name, kind, state, watch_date, score_maria)
values
  ('00000000-0000-0000-0000-0000000000a1', 'Series A', 'series', 'watched', '2026-01-02', 7),
  ('00000000-0000-0000-0000-0000000000a2', 'Series B', 'series', 'pending', null, null),
  ('00000000-0000-0000-0000-0000000000a3', 'Movie M', 'movie', 'pending', null, null);

-- S22: an existing series keeps its title-level columns and has no seasons.
select results_eq(
  $$select state, watch_date::text, score_maria
    from public.titles where id = '00000000-0000-0000-0000-0000000000a1'$$,
  $$values ('watched'::text, '2026-01-02'::text, 7::numeric)$$,
  'S22 existing series title-level columns are unchanged'
);
select is(
  (select count(*) from public.title_seasons
    where title_id = '00000000-0000-0000-0000-0000000000a1'),
  0::bigint,
  'S22 existing series has no seasons'
);

-- S1: a season persists.
select lives_ok(
  $$insert into public.title_seasons (title_id, season_number, state)
    values ('00000000-0000-0000-0000-0000000000a1', 1, 'watched')$$,
  'S1 season 1 with valid state and null scores persists'
);
select results_eq(
  $$select state, watch_date, score_maria, score_ignacio, kind
    from public.title_seasons
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 1$$,
  $$values ('watched'::text, null::date, null::numeric, null::numeric, 'series'::text)$$,
  'S1 season reads back with null date and scores'
);
select lives_ok(
  $$insert into public.title_seasons (title_id, season_number, state, watch_date)
    values ('00000000-0000-0000-0000-0000000000a1', 2, 'pending', '2026-05-05')$$,
  'S1 a second season with a date persists'
);

-- S2: (title, season_number) is unique.
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state)
    values ('00000000-0000-0000-0000-0000000000a1', 1, 'pending')$$,
  '23505', null, 'S2 duplicate season number rejected'
);

-- S3: season_number >= 1.
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state)
    values ('00000000-0000-0000-0000-0000000000a1', 0, 'pending')$$,
  '23514', null, 'S3 season 0 rejected'
);
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state)
    values ('00000000-0000-0000-0000-0000000000a1', -1, 'pending')$$,
  '23514', null, 'S3 season -1 rejected'
);

-- S4: state must be one of the six.
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state)
    values ('00000000-0000-0000-0000-0000000000a1', 3, 'dropped')$$,
  '23514', null, 'S4 state outside the legend rejected'
);
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state)
    values ('00000000-0000-0000-0000-0000000000a1', 3, null)$$,
  '23502', null, 'S4 null state rejected'
);
select lives_ok(
  $$insert into public.title_seasons (title_id, season_number, state)
    values ('00000000-0000-0000-0000-0000000000a1', 3, 'watched_awful')$$,
  'S4 another legend state accepted'
);

-- S5: score grid 0..10 step 0.25.
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state, score_maria)
    values ('00000000-0000-0000-0000-0000000000a2', 1, 'pending', 7.3)$$,
  '23514', null, 'S5 score_maria 7.3 rejected'
);
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state, score_maria)
    values ('00000000-0000-0000-0000-0000000000a2', 1, 'pending', 10.25)$$,
  '23514', null, 'S5 score_maria 10.25 rejected'
);
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state, score_ignacio)
    values ('00000000-0000-0000-0000-0000000000a2', 1, 'pending', -0.25)$$,
  '23514', null, 'S5 score_ignacio -0.25 rejected'
);
select lives_ok(
  $$insert into public.title_seasons (title_id, season_number, state, score_maria, score_ignacio)
    values ('00000000-0000-0000-0000-0000000000a2', 1, 'pending', 7.25, 0)$$,
  'S5 7.25 and 0 accepted'
);
select lives_ok(
  $$insert into public.title_seasons (title_id, season_number, state, score_maria)
    values ('00000000-0000-0000-0000-0000000000a2', 2, 'pending', 10)$$,
  'S5 10 accepted'
);

-- S6: a movie never has seasons.
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state)
    values ('00000000-0000-0000-0000-0000000000a3', 1, 'pending')$$,
  '23503', null, 'S6 season for a movie rejected'
);
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state, kind)
    values ('00000000-0000-0000-0000-0000000000a1', 4, 'pending', 'movie')$$,
  '23514', null, 'S6 kind other than series rejected'
);

-- updated_at trigger.
select lives_ok(
  $$update public.title_seasons set updated_at = '2000-01-01'
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 3$$,
  'trigger fixture: updated_at forced back'
);
select lives_ok(
  $$update public.title_seasons set state = 'watched'
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 3$$,
  'update of a season succeeds as owner'
);
select ok(
  (select updated_at > '2000-01-01'::timestamptz from public.title_seasons
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 3),
  'set_updated_at advances updated_at'
);

-- S7: deleting the series deletes its seasons.
select lives_ok(
  $$delete from public.titles where id = '00000000-0000-0000-0000-0000000000a2'$$,
  'S7 series with seasons deleted'
);
select is(
  (select count(*) from public.title_seasons
    where title_id = '00000000-0000-0000-0000-0000000000a2'),
  0::bigint,
  'S7 its seasons are gone'
);
select is(
  (select count(*) from public.title_seasons
    where title_id = '00000000-0000-0000-0000-0000000000a1'),
  3::bigint,
  'S7 other series keep their seasons'
);

-- Privileges: delete is only through the cascade.
select is(
  has_table_privilege('anon', 'public.title_seasons', 'select,insert,update,delete'),
  false,
  'R2.1 anon holds no privilege'
);
select is(
  has_table_privilege('authenticated', 'public.title_seasons', 'select,insert,update'),
  true,
  'R2.1 authenticated can select, insert and update'
);
select is(
  has_table_privilege('authenticated', 'public.title_seasons', 'delete'),
  false,
  'R2.1 authenticated cannot delete directly'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.title_seasons'::regclass),
  true,
  'R2.1 RLS enabled'
);

-- S8: anonymous reads nothing.
set local role anon;
select throws_ok(
  $$select * from public.title_seasons$$,
  '42501', null, 'S8 anon cannot select'
);
reset role;

-- S9: a third authenticated user reads and writes nothing.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"eve@example.test"}', true);
select is(
  (select count(*) from public.title_seasons),
  0::bigint,
  'S9 third user sees no seasons'
);
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state)
    values ('00000000-0000-0000-0000-0000000000a1', 9, 'pending')$$,
  '42501', null, 'S9 third user insert rejected'
);
select lives_ok(
  $$update public.title_seasons set state = 'urgent'$$,
  'S9 third user update runs but matches no rows'
);
reset role;
select is(
  (select count(*) from public.title_seasons where state = 'urgent'),
  0::bigint,
  'S9 third user changed nothing'
);
set local role authenticated;

-- S10 / S11 / S12: score ownership. ben is maria, ana is ignacio.
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ben@example.test"}', true);
select lives_ok(
  $$update public.title_seasons set score_maria = 9.5
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 1$$,
  'S10 maria sets her own score'
);
select throws_ok(
  $$update public.title_seasons set score_ignacio = 4
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 1$$,
  '42501', null, 'S11 maria cannot set the other score'
);
select lives_ok(
  $$update public.title_seasons set state = 'watched_rewatch', watch_date = '2026-06-06'
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 2$$,
  'S12 maria edits state and date'
);
select throws_ok(
  $$insert into public.title_seasons (title_id, season_number, state, score_ignacio)
    values ('00000000-0000-0000-0000-0000000000a1', 5, 'pending', 3)$$,
  '42501', null, 'S11 maria cannot insert the other score'
);

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select lives_ok(
  $$update public.title_seasons set state = 'watched_no_rewatch', watch_date = '2026-07-07'
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 2$$,
  'S12 ignacio edits state and date'
);
select throws_ok(
  $$update public.title_seasons set score_maria = 1
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 1$$,
  '42501', null, 'S11 ignacio cannot change score_maria'
);
select lives_ok(
  $$update public.title_seasons set score_ignacio = 8
    where title_id = '00000000-0000-0000-0000-0000000000a1' and season_number = 1$$,
  'S10 ignacio sets his own score'
);

select * from finish();
rollback;
