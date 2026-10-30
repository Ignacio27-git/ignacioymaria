-- titles table: shape, defaults and check constraints, exercised as the owner.
-- RLS and privileges are covered in access_control.test.sql.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(72);

-- TS-1.1: table shape.
select has_table('public', 'titles', 'TS-1.1 titles exists');
select columns_are(
  'public', 'titles',
  array[
    'id', 'name', 'kind', 'year', 'actors', 'observations', 'watch_date',
    'state', 'score_maria', 'score_ignacio', 'seasons_watched',
    'created_at', 'updated_at', 'tmdb_id', 'poster_path', 'seasons_total', 'name_search'
  ],
  'TS-1.1 titles has exactly the specified columns'
);
select hasnt_column('public', 'titles', 'owner_id', 'TS-1.1 no owner_id');
select hasnt_column('public', 'titles', 'average', 'TS-1.1 no stored average');
select col_is_pk('public', 'titles', 'id', 'TS-1.1 id is the primary key');
select col_not_null('public', 'titles', 'name', 'TS-1.1 name not null');
select col_not_null('public', 'titles', 'kind', 'TS-1.1 kind not null');
select col_not_null('public', 'titles', 'actors', 'TS-1.1 actors not null');
select col_not_null('public', 'titles', 'state', 'TS-1.1 state not null');
select col_not_null('public', 'titles', 'created_at', 'TS-1.1 created_at not null');
select col_not_null('public', 'titles', 'updated_at', 'TS-1.1 updated_at not null');
select col_is_null('public', 'titles', 'year', 'TS-1.1 year nullable');
select col_is_null('public', 'titles', 'observations', 'TS-1.1 observations nullable');
select col_is_null('public', 'titles', 'watch_date', 'TS-1.1 watch_date nullable');
select col_is_null('public', 'titles', 'score_maria', 'TS-1.1 score_maria nullable');
select col_is_null('public', 'titles', 'score_ignacio', 'TS-1.1 score_ignacio nullable');
select col_is_null('public', 'titles', 'seasons_watched', 'TS-1.1 seasons_watched nullable');
select col_type_is('public', 'titles', 'score_maria', 'numeric', 'TS-1.1 score_maria is unconstrained numeric');
select col_type_is('public', 'titles', 'watch_date', 'date', 'TS-1.1 watch_date is date');

-- TS-1.2: defaults.
select lives_ok(
  $$insert into public.titles (id, name, kind)
    values ('00000000-0000-0000-0000-000000000001', 'Alien', 'movie')$$,
  'TS-1.2 insert with only name and kind'
);
select results_eq(
  $$select state, actors, year, observations, watch_date, score_maria,
           score_ignacio, seasons_watched,
           created_at is not null, updated_at is not null
    from public.titles where id = '00000000-0000-0000-0000-000000000001'$$,
  $$values ('pending'::text, '{}'::text[], null::integer, null::text, null::date,
            null::numeric, null::numeric, null::integer, true, true)$$,
  'TS-1.2 defaults applied'
);

-- TS-2: kind.
select lives_ok(
  $$insert into public.titles (name, kind) values ('K movie', 'movie')$$,
  'TS-2.1 movie accepted'
);
select lives_ok(
  $$insert into public.titles (name, kind) values ('K series', 'series')$$,
  'TS-2.1 series accepted'
);
select throws_ok(
  $$insert into public.titles (name, kind) values ('Bad', 'book')$$,
  '23514', null, 'TS-2.2 kind book rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind) values ('Bad', '')$$,
  '23514', null, 'TS-2.2 empty kind rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind) values ('Bad', 'MOVIE')$$,
  '23514', null, 'TS-2.2 uppercase kind rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind) values ('Bad', null)$$,
  '23502', null, 'TS-2.2 null kind rejected'
);

-- TS-3: name.
select throws_ok(
  $$insert into public.titles (name, kind) values ('', 'movie')$$,
  '23514', null, 'TS-3.2 empty name rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind) values ('   ', 'movie')$$,
  '23514', null, 'TS-3.2 spaces-only name rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind) values (E'\t\n', 'movie')$$,
  '23514', null, 'TS-3.2 tab/newline-only name rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind) values (null, 'movie')$$,
  '23502', null, 'TS-3.2 null name rejected'
);

-- TS-4: state.
select lives_ok(
  $$insert into public.titles (name, kind, state)
    select 'state-' || s, 'movie', s
    from unnest(array['urgent', 'watched', 'watched_rewatch',
                      'watched_no_rewatch', 'watched_awful', 'pending']) as s$$,
  'TS-4.1 the six states are accepted'
);
select is(
  (select count(distinct state)::integer from public.titles where name like 'state-%'),
  6,
  'TS-4.1 six distinct states stored'
);
select throws_ok(
  $$insert into public.titles (name, kind, state) values ('Bad', 'movie', 'unknown')$$,
  '23514', null, 'TS-4.2 unknown state rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, state) values ('Bad', 'movie', 'Vista')$$,
  '23514', null, 'TS-4.2 spanish label rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, state) values ('Bad', 'movie', '')$$,
  '23514', null, 'TS-4.2 empty state rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, state) values ('Bad', 'movie', null)$$,
  '23502', null, 'TS-4.2 null state rejected'
);

-- TS-5.1: accepted scores are stored unchanged (compared as text: no rounding).
select lives_ok(
  $$insert into public.titles (name, kind, score_maria)
    select 'score-' || s, 'movie', s::numeric
    from unnest(array['0', '0.25', '0.5', '7.75', '10']) as s$$,
  'TS-5.1 grid scores accepted for score_maria'
);
select results_eq(
  $$select score_maria::text from public.titles as t
    where name like 'score-%' order by t.score_maria$$,
  $$values ('0'), ('0.25'), ('0.5'), ('7.75'), ('10')$$,
  'TS-5.1 scores read back unchanged'
);
select lives_ok(
  $$insert into public.titles (name, kind, score_ignacio) values ('ign-score', 'movie', 7.75)$$,
  'TS-5.1 grid score accepted for score_ignacio'
);

-- TS-5.2: out of range.
select throws_ok(
  $$insert into public.titles (name, kind, score_maria) values ('Bad', 'movie', -0.25)$$,
  '23514', null, 'TS-5.2 score_maria -0.25 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, score_maria) values ('Bad', 'movie', 10.25)$$,
  '23514', null, 'TS-5.2 score_maria 10.25 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, score_maria) values ('Bad', 'movie', 11)$$,
  '23514', null, 'TS-5.2 score_maria 11 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, score_ignacio) values ('Bad', 'movie', 10.25)$$,
  '23514', null, 'TS-5.2 score_ignacio 10.25 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, score_maria) values ('Bad', 'movie', 'NaN'::numeric)$$,
  '23514', null, 'TS-5.2 NaN rejected'
);

-- TS-5.3: off grid.
select throws_ok(
  $$insert into public.titles (name, kind, score_maria) values ('Bad', 'movie', 0.1)$$,
  '23514', null, 'TS-5.3 score_maria 0.1 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, score_maria) values ('Bad', 'movie', 0.3)$$,
  '23514', null, 'TS-5.3 score_maria 0.3 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, score_maria) values ('Bad', 'movie', 9.99)$$,
  '23514', null, 'TS-5.3 score_maria 9.99 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, score_ignacio) values ('Bad', 'movie', 0.1)$$,
  '23514', null, 'TS-5.3 score_ignacio 0.1 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, score_maria) values ('Bad', 'movie', 7.249)$$,
  '23514', null, 'TS-5.3 score_maria 7.249 rejected, not rounded'
);

-- TS-5.4: independence.
select lives_ok(
  $$insert into public.titles (name, kind, score_maria, score_ignacio) values ('Ind 1', 'movie', null, 8.5)$$,
  'TS-5.4 only score_ignacio set'
);
select lives_ok(
  $$insert into public.titles (name, kind, score_maria, score_ignacio) values ('Ind 2', 'movie', 8.5, null)$$,
  'TS-5.4 only score_maria set'
);

-- TS-5.5: update path.
select lives_ok(
  $$insert into public.titles (id, name, kind, score_maria)
    values ('00000000-0000-0000-0000-000000000002', 'Upd', 'movie', 6)$$,
  'TS-5.5 fixture row'
);
select throws_ok(
  $$update public.titles set score_maria = 0.1 where id = '00000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'TS-5.5 off-grid update rejected'
);
select is(
  (select score_maria from public.titles where id = '00000000-0000-0000-0000-000000000002'),
  6::numeric,
  'TS-5.5 stored score unchanged after rejected update'
);

-- TS-6: seasons_watched.
select lives_ok(
  $$insert into public.titles (name, kind, seasons_watched)
    select 'seasons-' || s, 'series', s from unnest(array[0, 3]) as s$$,
  'TS-6.1 series with 0 and 3 seasons accepted'
);
select lives_ok(
  $$insert into public.titles (name, kind, seasons_watched) values ('seasons-null', 'series', null)$$,
  'TS-6.1 series with null seasons accepted'
);
select throws_ok(
  $$insert into public.titles (name, kind, seasons_watched) values ('Bad', 'series', -1)$$,
  '23514', null, 'TS-6.2 negative seasons rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, seasons_watched) values ('Bad', 'movie', 1)$$,
  '23514', null, 'TS-6.3 movie with seasons 1 rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, seasons_watched) values ('Bad', 'movie', 0)$$,
  '23514', null, 'TS-6.3 movie with seasons 0 rejected'
);
select lives_ok(
  $$insert into public.titles (name, kind, seasons_watched) values ('movie-null-seasons', 'movie', null)$$,
  'TS-6.4 movie with null seasons accepted'
);
select throws_ok(
  $$update public.titles set seasons_watched = 2 where id = '00000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'TS-6.5 setting seasons on a movie rejected'
);

-- TS-7: year and watch date.
select lives_ok(
  $$insert into public.titles (id, name, kind, year, watch_date)
    values ('00000000-0000-0000-0000-000000000003', 'Dated', 'movie', 1999, '2024-02-29')$$,
  'TS-7.1 year and leap-day watch date accepted'
);
select results_eq(
  $$select year, watch_date::text from public.titles
    where id = '00000000-0000-0000-0000-000000000003'$$,
  $$values (1999, '2024-02-29')$$,
  'TS-7.1 year and watch date read back'
);
select throws_ok(
  $$insert into public.titles (name, kind, watch_date) values ('Bad', 'movie', '2024-02-30')$$,
  '22008', null, 'TS-7.2 invalid date rejected'
);

-- Actors: no null elements.
select lives_ok(
  $$insert into public.titles (name, kind, actors) values ('Cast', 'movie', array['A', 'B'])$$,
  'actors with names accepted'
);
select throws_ok(
  $$insert into public.titles (name, kind, actors) values ('Bad', 'movie', array['A', null])$$,
  '23514', null, 'actors with a null element rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, actors) values ('Bad', 'movie', null)$$,
  '23502', null, 'null actors rejected'
);

-- TS-8.1: timestamps. Backdated rows prove updated_at moves; a second update in
-- the same transaction proves the trigger uses the wall clock, not now().
select lives_ok(
  $$insert into public.titles (id, name, kind, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000004', 'Clock', 'movie',
            '2020-01-01 00:00:00+00', '2020-01-01 00:00:00+00')$$,
  'TS-8.1 backdated fixture row'
);
update public.titles set name = 'Clock 2' where id = '00000000-0000-0000-0000-000000000004';
create temp table first_update as
  select updated_at as u1 from public.titles where id = '00000000-0000-0000-0000-000000000004';
select ok(
  (select u1 > '2020-01-01 00:00:00+00'::timestamptz from first_update),
  'TS-8.1 updated_at advanced on update'
);
update public.titles set name = 'Clock 3' where id = '00000000-0000-0000-0000-000000000004';
select ok(
  (select t.updated_at > f.u1 from public.titles t, first_update f
   where t.id = '00000000-0000-0000-0000-000000000004'),
  'TS-8.1 updated_at advances again within one transaction'
);
select is(
  (select created_at from public.titles where id = '00000000-0000-0000-0000-000000000004'),
  '2020-01-01 00:00:00+00'::timestamptz,
  'TS-8.1 created_at unchanged by updates'
);

select * from finish();
rollback;
