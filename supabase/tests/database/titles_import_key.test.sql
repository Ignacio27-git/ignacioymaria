-- import_key on titles (ROADMAP 1.7): idempotency key for the Excel import.
-- Fixtures use fake data only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

select col_type_is('public', 'titles', 'import_key', 'text', 'import_key is text');
select col_is_null('public', 'titles', 'import_key', 'import_key is nullable');
select col_hasnt_default('public', 'titles', 'import_key', 'import_key has no default');

-- Existing rows stay untouched (null key).
insert into public.titles (id, name, kind)
values ('00000000-0000-0000-0000-0000000000e1', 'Legacy', 'movie');
select results_eq(
  $$select import_key from public.titles
    where id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$values (null::text)$$,
  'existing row has a null import_key'
);

-- A non-null key is accepted once and is unique afterwards.
select lives_ok(
  $$insert into public.titles (name, kind, import_key)
    values ('Imported', 'movie', 'pelis:imported')$$,
  'a titled row with a key is accepted'
);
select throws_ok(
  $$insert into public.titles (name, kind, import_key)
    values ('Imported again', 'series', 'pelis:imported')$$,
  '23505', null, 'a duplicate non-null import_key is rejected'
);

-- Many nulls are allowed (titles created in the app).
select lives_ok(
  $$insert into public.titles (name, kind) values ('Manual one', 'movie'), ('Manual two', 'movie')$$,
  'many rows with a null import_key are allowed'
);

-- A blank key is rejected.
select throws_ok(
  $$insert into public.titles (name, kind, import_key) values ('Blank', 'movie', '')$$,
  '23514', null, 'an empty import_key is rejected'
);
select throws_ok(
  $$insert into public.titles (name, kind, import_key) values ('Spaces', 'movie', '   ')$$,
  '23514', null, 'a whitespace-only import_key is rejected'
);

select * from finish();
rollback;
