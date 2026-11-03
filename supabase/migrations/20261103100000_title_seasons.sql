-- Season ratings (ROADMAP 1.8): one row per season of a series.
--
-- Purely additive and with NO data: existing series get no season rows and
-- keep their title-level columns (the app falls back to them). The check
-- constraints copy the ones in public.titles.
--
-- A season belongs to a series only: `kind` is pinned to 'series' and the
-- composite FK (title_id, kind) -> titles(id, kind) rejects a movie. Deleting
-- a title deletes its seasons through the FK; clients get no DELETE grant.
-- State and watch_date are editable by either person; each person writes only
-- their own score (enforce_score_ownership, defined in couple_auth).
--
-- Rollback (as postgres), a forward migration:
--   drop table public.title_seasons;
--   alter table public.titles drop constraint titles_id_kind_key;

alter table public.titles
  add constraint titles_id_kind_key unique (id, kind);

create table public.title_seasons (
  title_id uuid not null,
  season_number integer not null check (season_number >= 1),
  kind text not null default 'series' check (kind = 'series'),
  state text not null default 'pending'
    check (state in (
      'urgent', 'watched', 'watched_rewatch',
      'watched_no_rewatch', 'watched_awful', 'pending'
    )),
  -- null means the watch date is unknown (no sentinel date).
  watch_date date,
  -- Plain numeric on purpose, as in titles: valid scores are 0..10 in 0.25 steps.
  score_maria numeric
    check (score_maria between 0 and 10 and mod(score_maria * 4, 1) = 0),
  score_ignacio numeric
    check (score_ignacio between 0 and 10 and mod(score_ignacio * 4, 1) = 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (title_id, season_number),
  foreign key (title_id, kind)
    references public.titles (id, kind) on delete cascade
);

create trigger title_seasons_set_updated_at
before update on public.title_seasons
for each row execute function public.set_updated_at();

create trigger title_seasons_enforce_score_ownership
before insert or update on public.title_seasons
for each row execute function public.enforce_score_ownership();

alter table public.title_seasons enable row level security;

-- Supabase default privileges grant anon/authenticated on new tables.
revoke all on table public.title_seasons from anon, authenticated;
grant select, insert, update on table public.title_seasons to authenticated;

-- (select ...) lets Postgres evaluate is_allowed() once per statement.
create policy title_seasons_select on public.title_seasons
  for select to authenticated
  using ((select public.is_allowed()));

create policy title_seasons_insert on public.title_seasons
  for insert to authenticated
  with check ((select public.is_allowed()));

create policy title_seasons_update on public.title_seasons
  for update to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));
