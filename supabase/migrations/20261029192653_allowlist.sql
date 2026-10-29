-- Allowlist of the accounts that may use the app.
--
-- The table holds no rows after migrations: real addresses are never versioned.
-- On a hosted project they are inserted manually (see docs/DECISIONS.md).
-- Clients never read this table; they only call public.is_allowed().

create table public.allowed_emails (
  -- Lowercase and containing at least one non-whitespace character.
  email text primary key
    check (email = lower(email) and email ~ '\S'),
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

-- Supabase default privileges grant anon/authenticated on new tables.
-- Revoke them: RLS stays on with no policies as a second barrier.
revoke all on table public.allowed_emails from anon, authenticated;

-- True when the caller's JWT email (case-insensitive) is in the allowlist.
-- SECURITY DEFINER so it can read the table the client roles cannot, with an
-- empty search_path so every reference below is schema-qualified.
create function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_emails
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

revoke execute on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;
