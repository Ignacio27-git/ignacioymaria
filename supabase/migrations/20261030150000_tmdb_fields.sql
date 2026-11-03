-- TMDB fields on titles (ROADMAP 1.5): purely additive and nullable.
--
-- Mirrors src/domain/title.ts: tmdbId and posterPath on any title, seasonsTotal
-- on series only. seasons_total is independent of seasons_watched (no
-- cross-check). Only the poster path is stored; the image URL is built at
-- render time. RLS, grants and triggers are untouched.

alter table public.titles
  add column tmdb_id integer
    check (tmdb_id is null or tmdb_id > 0),
  add column poster_path text
    check (poster_path is null or (poster_path <> '' and left(poster_path, 1) = '/')),
  add column seasons_total integer
    check (seasons_total is null or (kind = 'series' and seasons_total >= 1));
