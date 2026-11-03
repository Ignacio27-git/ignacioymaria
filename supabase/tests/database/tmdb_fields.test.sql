-- TMDB fields on titles: tmdb_id, poster_path, seasons_total (ROADMAP 1.5).
-- Fixtures use fake *.example.test addresses only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

-- A row that exists before the new fields are used must keep NULLs (S-DB-2).
insert into public.titles (id, name, kind)
values ('00000000-0000-0000-0000-0000000000d1', 'Legacy', 'movie');

-- S-DB-1: columns exist, with the expected types, and are nullable.
select col_type_is('public', 'titles', 'tmdb_id', 'integer', 'S-DB-1 tmdb_id is integer');
select col_type_is('public', 'titles', 'poster_path', 'text', 'S-DB-1 poster_path is text');
select col_type_is('public', 'titles', 'seasons_total', 'integer', 'S-DB-1 seasons_total is integer');
select col_is_null('public', 'titles', 'tmdb_id', 'S-DB-1 tmdb_id nullable');
select col_is_null('public', 'titles', 'poster_path', 'S-DB-1 poster_path nullable');
select col_is_null('public', 'titles', 'seasons_total', 'S-DB-1 seasons_total nullable');
select col_hasnt_default('public', 'titles', 'tmdb_id', 'S-DB-1 tmdb_id has no default');
select col_hasnt_default('public', 'titles', 'poster_path', 'S-DB-1 poster_path has no default');
select col_hasnt_default('public', 'titles', 'seasons_total', 'S-DB-1 seasons_total has no default');

-- S-DB-2: pre-existing rows are untouched.
select results_eq(
  $$select tmdb_id, poster_path, seasons_total from public.titles
    where id = '00000000-0000-0000-0000-0000000000d1'$$,
  $$values (null::integer, null::text, null::integer)$$,
  'S-DB-2 existing row has NULL TMDB fields'
);

-- S-DB-3: valid values are accepted and read back unchanged.
select lives_ok(
  $$insert into public.titles (id, name, kind, tmdb_id, poster_path, seasons_total)
    values ('00000000-0000-0000-0000-0000000000d2', 'Series', 'series', 1399, '/p.jpg', 3)$$,
  'S-DB-3 series with TMDB fields and seasons_total 3 accepted'
);
select results_eq(
  $$select tmdb_id, poster_path, seasons_total from public.titles
    where id = '00000000-0000-0000-0000-0000000000d2'$$,
  $$values (1399, '/p.jpg'::text, 3)$$,
  'S-DB-3 TMDB fields read back unchanged'
);
select lives_ok(
  $$insert into public.titles (name, kind, tmdb_id, poster_path)
    values ('Film', 'movie', 603, '/m.png')$$,
  'S-DB-3 movie with tmdb_id and poster_path accepted'
);
select lives_ok(
  $$insert into public.titles (name, kind, seasons_total) values ('Open series', 'series', null)$$,
  'S-DB-3 series with null seasons_total accepted'
);
select lives_ok(
  $$insert into public.titles (name, kind, seasons_watched, seasons_total)
    values ('Independent', 'series', 5, 2)$$,
  'seasons_watched and seasons_total are independent'
);

-- S-DB-4: seasons_total only for series.
select throws_ok(
  $$insert into public.titles (name, kind, seasons_total) values ('Bad', 'movie', 3)$$,
  '23514', null, 'S-DB-4 movie with seasons_total rejected'
);
select throws_ok(
  $$update public.titles set seasons_total = 2
    where id = '00000000-0000-0000-0000-0000000000d1'$$,
  '23514', null, 'S-DB-4 setting seasons_total on an existing movie rejected'
);

-- S-DB-5: invalid values.
select throws_ok(
  $$insert into public.titles (name, kind, tmdb_id) values ('Bad', 'movie', 0)$$,
  '23514', null, 'S-DB-5 tmdb_id 0 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, tmdb_id) values ('Bad', 'movie', -5)$$,
  '23514', null, 'S-DB-5 negative tmdb_id rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, poster_path) values ('Bad', 'movie', '')$$,
  '23514', null, 'S-DB-5 empty poster_path rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, poster_path) values ('Bad', 'movie', 'abc')$$,
  '23514', null, 'S-DB-5 poster_path without a leading slash rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, seasons_total) values ('Bad', 'series', 0)$$,
  '23514', null, 'S-DB-5 seasons_total 0 rejected'
);

-- S-DB-6: RLS is unchanged. ana is allowlisted, eve is not.
insert into public.allowed_emails (email, person) values ('ana@example.test', 'ignacio');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"eve@example.test"}', true);
select is_empty(
  $$select tmdb_id, poster_path, seasons_total from public.titles$$,
  'S-DB-6 outsider reads no TMDB fields'
);
select throws_ok(
  $$insert into public.titles (name, kind, tmdb_id) values ('Eve', 'movie', 1)$$,
  '42501', null, 'S-DB-6 outsider cannot insert TMDB fields'
);

select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select lives_ok(
  $$insert into public.titles (id, name, kind, tmdb_id, poster_path, seasons_total)
    values ('00000000-0000-0000-0000-0000000000d3', 'Ana series', 'series', 1396, '/b.jpg', 5)$$,
  'S-DB-6 allowlisted user writes the TMDB fields'
);
select results_eq(
  $$select tmdb_id, poster_path, seasons_total from public.titles
    where id = '00000000-0000-0000-0000-0000000000d3'$$,
  $$values (1396, '/b.jpg'::text, 5)$$,
  'S-DB-6 allowlisted user reads the TMDB fields'
);
select lives_ok(
  $$update public.titles set poster_path = '/c.jpg'
    where id = '00000000-0000-0000-0000-0000000000d3'$$,
  'S-DB-6 allowlisted user updates a TMDB field'
);
select throws_ok(
  $$update public.titles set poster_path = 'c.jpg'
    where id = '00000000-0000-0000-0000-0000000000d3'$$,
  '23514', null, 'S-DB-6 constraints also apply on update'
);
reset role;

select * from finish();
rollback;
