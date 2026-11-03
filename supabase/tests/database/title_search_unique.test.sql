-- Search support and uniqueness on titles (ROADMAP 1.6).
-- Fixtures use fake *.example.test addresses only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

-- TC-3: fold_search is lowercase and accent-free, and immutable.
select is(public.fold_search('Amélie'), 'amelie', 'fold_search strips accents and lowercases');
select is(public.fold_search('LÉON'), 'leon', 'fold_search handles uppercase accents');
select is(public.fold_search('Ñandú'), 'nandu', 'fold_search folds n with tilde');
select is(public.fold_search('Plain'), 'plain', 'fold_search keeps plain ASCII');
select is(public.fold_search(null), null, 'fold_search of null is null');
select is(
  (select provolatile::text from pg_proc
    where proname = 'fold_search' and pronamespace = 'public'::regnamespace),
  'i', 'fold_search is immutable'
);

-- name_search is generated and follows insert and name updates.
insert into public.titles (id, name, kind)
values ('00000000-0000-0000-0000-0000000000e1', 'Amélie', 'movie');
select is(
  (select name_search from public.titles where id = '00000000-0000-0000-0000-0000000000e1'),
  'amelie', 'name_search is filled on insert'
);
select is(
  (select count(*)::int from public.titles where name_search ilike '%' || public.fold_search('AMÉL') || '%'),
  1, 'accent- and case-insensitive prefix matches'
);
select is(
  (select count(*)::int from public.titles where name_search like '%amelie%'),
  1, 'plain lowercase query matches'
);

update public.titles set name = 'Léon'
where id = '00000000-0000-0000-0000-0000000000e1';
select is(
  (select name_search from public.titles where id = '00000000-0000-0000-0000-0000000000e1'),
  'leon', 'name_search follows a name update'
);
select is(
  (select count(*)::int from public.titles where name_search like '%amelie%'),
  0, 'old name no longer matches'
);
select is(
  (select count(*)::int from public.titles where name_search like '%leon%'),
  1, 'new name matches'
);
select throws_ok(
  $$update public.titles set name_search = 'x'
    where id = '00000000-0000-0000-0000-0000000000e1'$$,
  '428C9', null, 'name_search cannot be written directly'
);

-- TC-2: unique (kind, tmdb_id) where tmdb_id is not null.
select has_index('public', 'titles', 'titles_kind_tmdb_id_key', 'unique index exists');
insert into public.titles (name, kind, tmdb_id) values ('Fight Club', 'movie', 550);
select throws_ok(
  $$insert into public.titles (name, kind, tmdb_id) values ('Again', 'movie', 550)$$,
  '23505', null, 'same kind and tmdb_id is rejected'
);
select lives_ok(
  $$insert into public.titles (name, kind, tmdb_id) values ('Same id series', 'series', 550)$$,
  'a series may share the tmdb_id of a movie'
);
select lives_ok(
  $$insert into public.titles (name, kind) values ('Mi peli', 'movie'), ('Mi peli', 'movie')$$,
  'manual titles with null tmdb_id never collide'
);
select lives_ok(
  $$insert into public.titles (name, kind, tmdb_id) values ('Other', 'movie', 551)$$,
  'a different tmdb_id is accepted'
);

-- The 42501 trigger and RLS are unchanged: an outsider still cannot write.
insert into public.allowed_emails (email, person) values ('ana@example.test', 'ignacio');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"eve@example.test"}', true);
select throws_ok(
  $$insert into public.titles (name, kind, tmdb_id) values ('Eve', 'movie', 9001)$$,
  '42501', null, 'outsider still cannot insert'
);
select set_config('request.jwt.claims',
  '{"role":"authenticated","email":"ana@example.test"}', true);
select lives_ok(
  $$insert into public.titles (name, kind, tmdb_id) values ('Ana', 'movie', 9002)$$,
  'allowlisted user inserts through the new index'
);
select throws_ok(
  $$insert into public.titles (name, kind, tmdb_id) values ('Ana again', 'movie', 9002)$$,
  '23505', null, 'duplicates are rejected for allowlisted users too'
);
select throws_ok(
  $$update public.titles set score_maria = 5 where name = 'Ana'$$,
  '42501', null, 'score trigger unchanged: ignacio cannot write score_maria'
);
reset role;

select * from finish();
rollback;
