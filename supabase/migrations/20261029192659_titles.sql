-- Shared titles table (movies and series) for the two allowlisted accounts.
--
-- Mirrors src/domain: the database rejects what createTitle rejects. It is
-- deliberately stricter in one place: createTitle silently ignores
-- seasonsWatched on a movie, while the database refuses to store it.
-- There is no owner column: every allowlisted user sees every row.
-- The average is never stored; it is computed from the two scores.

create table public.titles (
  id uuid primary key default gen_random_uuid(),
  -- \S requires a non-whitespace character (btrim only strips spaces).
  name text not null check (name ~ '\S'),
  kind text not null check (kind in ('movie', 'series')),
  year integer,
  actors text[] not null default '{}'
    check (array_position(actors, null) is null),
  observations text,
  -- null means the watch date is unknown (no sentinel date).
  watch_date date,
  state text not null default 'pending'
    check (state in (
      'urgent', 'watched', 'watched_rewatch',
      'watched_no_rewatch', 'watched_awful', 'pending'
    )),
  -- Plain numeric on purpose: numeric(p, s) would round 7.249 to 7.25.
  -- Valid scores are 0..10 in steps of 0.25; NaN fails the range check.
  score_maria numeric
    check (score_maria between 0 and 10 and mod(score_maria * 4, 1) = 0),
  score_ignacio numeric
    check (score_ignacio between 0 and 10 and mod(score_ignacio * 4, 1) = 0),
  seasons_watched integer
    check (seasons_watched is null or (kind = 'series' and seasons_watched >= 0)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- clock_timestamp() (not now()) so repeated updates in one transaction advance.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create trigger titles_set_updated_at
before update on public.titles
for each row execute function public.set_updated_at();

alter table public.titles enable row level security;

-- Supabase default privileges grant anon/authenticated on new tables.
revoke all on table public.titles from anon, authenticated;
grant select, insert, update, delete on table public.titles to authenticated;

-- (select ...) lets Postgres evaluate is_allowed() once per statement.
create policy titles_select on public.titles
  for select to authenticated
  using ((select public.is_allowed()));

create policy titles_insert on public.titles
  for insert to authenticated
  with check ((select public.is_allowed()));

create policy titles_update on public.titles
  for update to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));

create policy titles_delete on public.titles
  for delete to authenticated
  using ((select public.is_allowed()));
