-- Title search and duplicate guard (ROADMAP 1.6).
--
-- fold_search(text): lowercase, accent-free form of a string. Immutable so it
-- can back a stored generated column. The TypeScript mirror is
-- src/domain/search.ts (foldSearch); both share the same fixtures.
-- name_search: generated from name, so any writer (including the 1.7 import as
-- postgres) keeps it in sync. Never written directly.
-- titles_kind_tmdb_id_key: one row per (kind, tmdb_id) when tmdb_id is set;
-- manual titles (tmdb_id null) are never constrained against each other.
--
-- Rollback (as postgres):
--   drop index public.titles_kind_tmdb_id_key;
--   alter table public.titles drop column name_search;
--   drop function public.fold_search(text);

create function public.fold_search(input text)
returns text
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $$
  select lower(
    regexp_replace(
      normalize(input, nfd),
      '[̀-ͯ]',
      '',
      'g'
    )
  )
$$;

alter table public.titles
  add column name_search text
    generated always as (public.fold_search(name)) stored;

create unique index titles_kind_tmdb_id_key
  on public.titles (kind, tmdb_id)
  where tmdb_id is not null;
