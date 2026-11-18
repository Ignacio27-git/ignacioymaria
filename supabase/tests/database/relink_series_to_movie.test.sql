-- relink_series_to_movie (ROADMAP 3.2): the security-definer RPC that folds a
-- series with exactly one season row into a movie. Covers the function shape
-- and privileges (RL-10), the fold (RL-13), the failure codes and the rollback.
-- Fixtures use fake *.example.test addresses only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

-- Function shape and privileges.
select has_function(
  'public', 'relink_series_to_movie',
  array['uuid', 'integer', 'text', 'integer', 'text[]', 'text'],
  'RL-10 the function exists with its signature'
);
select is_definer(
  'public', 'relink_series_to_movie',
  array['uuid', 'integer', 'text', 'integer', 'text[]', 'text'],
  'RL-10 it is security definer'
);
select function_owner_is(
  'public', 'relink_series_to_movie',
  array['uuid', 'integer', 'text', 'integer', 'text[]', 'text'],
  'postgres',
  'RL-10 it is owned by postgres'
);
select ok(
  (select coalesce(proconfig, '{}') @> array['search_path=""']
     from pg_proc
    where oid = 'public.relink_series_to_movie(uuid, integer, text, integer, text[], text)'::regprocedure),
  'RL-10 its search_path is fixed and empty'
);
select function_privs_are(
  'public', 'relink_series_to_movie',
  array['uuid', 'integer', 'text', 'integer', 'text[]', 'text'],
  'authenticated', array['EXECUTE'],
  'RL-10 authenticated can execute it'
);
select is(
  has_function_privilege(
    'anon',
    'public.relink_series_to_movie(uuid, integer, text, integer, text[], text)',
    'execute'
  ),
  false,
  'RL-10 anon cannot execute it'
);

-- Fixtures (as owner). ana is ignacio, ben is maria.
insert into public.allowed_emails (email, person)
values ('ana@example.test', 'ignacio'), ('ben@example.test', 'maria');

insert into public.titles
  (id, name, kind, state, watch_date, score_maria, score_ignacio,
   observations, import_key, tmdb_id, seasons_total, seasons_watched, year)
values
  -- F1: one season, stale title-level values.
  ('00000000-0000-0000-0000-0000000000f1', 'Dark (old)', 'series', 'pending',
   '2020-01-01', 1, 2, 'keep me', 'pelis:dark', 111, 3, 1, 2017),
  -- F2: one season whose ignacio score and date are null; the title has stale ones.
  ('00000000-0000-0000-0000-0000000000f2', 'Series F2', 'series', 'watched',
   '2021-02-02', 4, 5, null, null, null, null, null, null),
  -- Z0: no seasons. Z2: two seasons.
  ('00000000-0000-0000-0000-0000000000a0', 'Series Z0', 'series', 'pending',
   null, null, null, null, null, null, null, 2, null),
  ('00000000-0000-0000-0000-0000000000a2', 'Series Z2', 'series', 'pending',
   null, null, null, null, null, null, null, null, null),
  -- M: a movie. H: holds (movie, 777). F3 and F4: one season each.
  ('00000000-0000-0000-0000-0000000000b0', 'Movie M', 'movie', 'pending',
   null, null, null, null, null, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000c0', 'Holder', 'movie', 'pending',
   null, null, null, null, null, 777, null, null, null),
  ('00000000-0000-0000-0000-0000000000f3', 'Series F3', 'series', 'pending',
   null, null, null, null, null, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000f4', 'Series F4', 'series', 'pending',
   null, null, null, null, null, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000f5', 'Series F5', 'series', 'pending',
   null, 3, null, null, null, null, null, null, null);

insert into public.title_seasons
  (title_id, season_number, state, watch_date, score_maria, score_ignacio)
values
  ('00000000-0000-0000-0000-0000000000f1', 1, 'watched', '2026-03-03', 8, 7),
  ('00000000-0000-0000-0000-0000000000f2', 1, 'watched_awful', null, 8, null),
  ('00000000-0000-0000-0000-0000000000a2', 1, 'watched', null, null, null),
  ('00000000-0000-0000-0000-0000000000a2', 2, 'pending', null, null, null),
  ('00000000-0000-0000-0000-0000000000f3', 1, 'watched', null, null, null),
  ('00000000-0000-0000-0000-0000000000f4', 1, 'watched', null, null, null),
  ('00000000-0000-0000-0000-0000000000f5', 1, 'watched_rewatch', '2026-04-04', 6, 9);

-- Anonymous: the grant is missing.
set local role anon;
select throws_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000f1', 500, 'No te preocupes carino', 2025,
      array['A'], '/p.jpg')$$,
  '42501', null, 'RL-10 anon call is denied'
);
reset role;

-- An authenticated user who is not on the allowlist.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"eve@example.test"}', true);
select throws_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000f1', 500, 'No te preocupes carino', 2025,
      array['A'], '/p.jpg')$$,
  '42501', null, 'RL-10 a non-allowlisted caller is denied'
);
reset role;
select is(
  (select count(*) from public.title_seasons
    where title_id = '00000000-0000-0000-0000-0000000000f1'),
  1::bigint,
  'RL-10 the denied call left the season row in place'
);

-- RL-13 fold success, as ignacio.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select lives_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000f1', 500, 'No te preocupes cariño', 2025,
      array['Ana', 'Beto'], '/p.jpg')$$,
  'RL-13 the fold runs for an allowlisted caller'
);
reset role;
select results_eq(
  $$select kind, state, watch_date::text, score_maria, score_ignacio, name,
           tmdb_id, year, actors, poster_path, seasons_total, seasons_watched,
           observations, import_key
      from public.titles where id = '00000000-0000-0000-0000-0000000000f1'$$,
  $$values ('movie'::text, 'watched'::text, '2026-03-03'::text, 8::numeric,
            7::numeric, 'No te preocupes cariño'::text, 500, 2025,
            array['Ana', 'Beto']::text[], '/p.jpg'::text, null::integer,
            null::integer, 'keep me'::text, 'pelis:dark'::text)$$,
  'RL-13 the title is a movie with the season data, the TMDB fields and our data kept'
);
select is(
  (select count(*) from public.title_seasons
    where title_id = '00000000-0000-0000-0000-0000000000f1'),
  0::bigint,
  'RL-13 the season row is deleted'
);

-- RL-13 a null season value overwrites a stale title value.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select lives_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000f2', 501, 'Pelicula F2', null,
      '{}', null)$$,
  'RL-13 the fold with null season values runs'
);
reset role;
select results_eq(
  $$select state, watch_date, score_maria, score_ignacio, year, poster_path
      from public.titles where id = '00000000-0000-0000-0000-0000000000f2'$$,
  $$values ('watched_awful'::text, null::date, 8::numeric, null::numeric,
            null::integer, null::text)$$,
  'RL-13 null date and score overwrite the stale title values; each score moves as is'
);

-- RL-13 as maria: both scores move, including the one she does not own.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ben@example.test"}', true);
select lives_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000f5', 505, 'Pelicula F5', 2024,
      '{}', '/f5.jpg')$$,
  'RL-13 maria can fold too'
);
reset role;
select results_eq(
  $$select state, watch_date::text, score_maria, score_ignacio
      from public.titles where id = '00000000-0000-0000-0000-0000000000f5'$$,
  $$values ('watched_rewatch'::text, '2026-04-04'::text, 6::numeric, 9::numeric)$$,
  'RL-13 the ownership bypass lets the fold copy the other person score'
);

-- Failure codes: nothing changes.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select throws_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000a0', 502, 'X', 2020, '{}', null)$$,
  'P0003', null, 'RL-7 zero season rows fail with P0003'
);
select throws_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000a2', 502, 'X', 2020, '{}', null)$$,
  'P0003', null, 'RL-13 two season rows fail with P0003 (race re-count)'
);
select throws_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000dd', 502, 'X', 2020, '{}', null)$$,
  'P0002', null, 'an unknown title fails with P0002'
);
select throws_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000b0', 502, 'X', 2020, '{}', null)$$,
  '22023', null, 'a movie fails with 22023'
);
select throws_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000f3', 777, 'X', 2020, '{}', null)$$,
  '23505', null, 'RL-8 a (movie, tmdb_id) held by another title fails with 23505'
);
select throws_ok(
  $$select public.relink_series_to_movie(
      '00000000-0000-0000-0000-0000000000f4', 503, '   ', 2020, '{}', null)$$,
  '23514', null, 'a blank name fails with 23514'
);
reset role;

select is(
  (select count(*) from public.title_seasons
    where title_id in ('00000000-0000-0000-0000-0000000000a2')),
  2::bigint,
  'the two-season series keeps both rows'
);
select results_eq(
  $$select kind, seasons_watched from public.titles
     where id = '00000000-0000-0000-0000-0000000000a0'$$,
  $$values ('series'::text, 2)$$,
  'the zero-season series is unchanged'
);
select results_eq(
  $$select t.kind, t.name, (select count(*) from public.title_seasons s
                            where s.title_id = t.id)
      from public.titles t where t.id = '00000000-0000-0000-0000-0000000000f3'$$,
  $$values ('series'::text, 'Series F3'::text, 1::bigint)$$,
  'RL-13 the duplicate rolled back: still a series with its season row'
);
select results_eq(
  $$select t.kind, t.name, (select count(*) from public.title_seasons s
                            where s.title_id = t.id)
      from public.titles t where t.id = '00000000-0000-0000-0000-0000000000f4'$$,
  $$values ('series'::text, 'Series F4'::text, 1::bigint)$$,
  'the blank name rolled back: still a series with its season row'
);

-- The ownership trigger still rejects a direct client write.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ben@example.test"}', true);
select throws_ok(
  $$update public.titles set score_ignacio = 4
     where id = '00000000-0000-0000-0000-0000000000a0'$$,
  '42501', null, 'RL-13 a direct update of the other person score is still rejected'
);
select throws_ok(
  $$update public.title_seasons set score_ignacio = 4
     where title_id = '00000000-0000-0000-0000-0000000000a2' and season_number = 1$$,
  '42501', null, 'RL-13 the same holds for a season score'
);
reset role;

select * from finish();
rollback;
