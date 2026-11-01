-- Idempotency key for the Excel import (ROADMAP 1.7): purely additive.
--
-- import_key identifies a title coming from the import ('pelis:' + folded clean
-- name). It is null for every title created in the app, and a unique column
-- allows many nulls. The importer inserts with `on conflict do nothing`, so a
-- repeated run never touches rows that already exist. RLS, grants and triggers
-- are untouched.
--
-- Rollback (as postgres):
--   delete from public.titles where import_key is not null;
--   alter table public.titles drop column import_key;

alter table public.titles
  add column import_key text unique
    -- \S requires a non-whitespace character (btrim only strips spaces).
    check (import_key is null or import_key ~ '\S');
