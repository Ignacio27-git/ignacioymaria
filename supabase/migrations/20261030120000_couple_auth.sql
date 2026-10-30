-- Couple auth: person mapping, signup allowlist hook and score ownership.
--
-- No rows are inserted: real addresses are never versioned. On a hosted
-- project that already holds allowlist rows this migration fails loudly
-- (person is NOT NULL); see docs/DECISIONS.md for the manual steps.

-- Which of the two people owns each allowlisted address.
alter table public.allowed_emails
  add column person text not null unique
    check (person in ('ignacio', 'maria'));

-- The person for the caller's JWT email (case-insensitive), or null when the
-- claim is missing or the email is not allowlisted. Same pattern as
-- is_allowed(): SECURITY DEFINER reads the table clients cannot, so removing
-- an allowlist row takes effect immediately.
create function public.current_person()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select person
  from public.allowed_emails
  where email = lower(auth.jwt() ->> 'email');
$$;

revoke execute on function public.current_person() from public, anon;
grant execute on function public.current_person() to authenticated;

-- before_user_created auth hook: only allowlisted emails may create a user.
-- SECURITY INVOKER on purpose: it runs as supabase_auth_admin, which gets
-- read-only access to the allowlist below and nothing else.
create function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  -- A missing or null email never matches, so it falls through to the error.
  if exists (
    select 1
    from public.allowed_emails
    where email = lower(event -> 'user' ->> 'email')
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Sign-in is not available for this email.'
    )
  );
end;
$$;

revoke execute on function public.before_user_created_hook(jsonb)
  from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_user_created_hook(jsonb)
  to supabase_auth_admin;

-- Read-only access for the hook; client roles still hold no privileges.
grant select on table public.allowed_emails to supabase_auth_admin;

create policy allowed_emails_auth_admin_select on public.allowed_emails
  for select to supabase_auth_admin
  using (true);

-- Each person writes only their own score. RLS cannot compare columns per
-- user, so a trigger does it. It only restricts the authenticated role when
-- the JWT maps to a person: migrations and the 1.7 import (postgres) are not
-- restricted, and sessions without a person are already denied by RLS.
create function public.enforce_score_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_person text;
  v_violation boolean;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  v_person := public.current_person();
  if v_person is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_violation := case v_person
      when 'ignacio' then new.score_maria is not null
      else new.score_ignacio is not null
    end;
  else
    v_violation := case v_person
      when 'ignacio' then new.score_maria is distinct from old.score_maria
      else new.score_ignacio is distinct from old.score_ignacio
    end;
  end if;

  if v_violation then
    raise exception 'A person can only write their own score'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger titles_enforce_score_ownership
before insert or update on public.titles
for each row execute function public.enforce_score_ownership();
