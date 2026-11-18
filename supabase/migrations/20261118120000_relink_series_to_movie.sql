-- Relink a series to a movie (ROADMAP 3.2): the single-season fold.
--
-- A series with exactly one title_seasons row can become a movie. In one
-- transaction this function moves that season's state, watch_date and both
-- scores onto the title, deletes the season row and applies the TMDB-owned
-- fields. It is purely additive: a function only, no table or column change.
--
-- SECURITY DEFINER because the fold writes both scores, which the
-- enforce_score_ownership trigger forbids to a client (it returns early when
-- current_user <> 'authenticated', and inside this function current_user is
-- the owner). A definer bypasses RLS, so the function checks is_allowed()
-- itself. The search_path is empty and every reference is schema-qualified.
-- Only `authenticated` can execute it; the bypass is not reachable by direct
-- client writes.
--
-- Failure codes (any error aborts the whole call; a PostgREST rpc is one
-- transaction):
--   42501  caller not on the allowlist
--   P0002  title not found
--   22023  title is not a series
--   P0003  season count is not exactly 1 (re-counted under the row lock)
--   23505  another title already holds (movie, tmdb_id)
--   23514  a check constraint failed (for example a blank name)
--
-- Rollback (as postgres), a forward migration:
--   drop function public.relink_series_to_movie(uuid, integer, text, integer, text[], text);

create function public.relink_series_to_movie(
  p_title_id uuid,
  p_tmdb_id integer,
  p_name text,
  p_year integer,
  p_actors text[],
  p_poster_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_count integer;
  v_season record;
begin
  if not (select public.is_allowed()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  -- The row lock also blocks a concurrent season insert (its FK check needs
  -- FOR KEY SHARE on this row), so the re-count below cannot go stale.
  select t.kind into v_kind
    from public.titles t
   where t.id = p_title_id
     for update;
  if not found then
    raise exception 'Title not found' using errcode = 'P0002';
  end if;
  if v_kind <> 'series' then
    raise exception 'Only a series can be folded' using errcode = '22023';
  end if;

  select count(*) into v_count
    from public.title_seasons s
   where s.title_id = p_title_id;
  if v_count <> 1 then
    raise exception 'The series must have exactly one season row'
      using errcode = 'P0003';
  end if;

  select s.state, s.watch_date, s.score_maria, s.score_ignacio
    into v_season
    from public.title_seasons s
   where s.title_id = p_title_id;

  -- First: the composite FK (title_id, kind) has no ON UPDATE action, so the
  -- title cannot stop being a series while a season row still points at it.
  delete from public.title_seasons where title_id = p_title_id;

  update public.titles
     set kind = 'movie',
         name = p_name,
         year = p_year,
         actors = coalesce(p_actors, '{}'),
         tmdb_id = p_tmdb_id,
         poster_path = p_poster_path,
         seasons_total = null,
         seasons_watched = null,
         state = v_season.state,
         watch_date = v_season.watch_date,
         score_maria = v_season.score_maria,
         score_ignacio = v_season.score_ignacio
   where id = p_title_id;
end;
$$;

revoke execute on function public.relink_series_to_movie(uuid, integer, text, integer, text[], text)
  from public, anon;
grant execute on function public.relink_series_to_movie(uuid, integer, text, integer, text[], text)
  to authenticated;
