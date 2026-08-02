-- Quick login: short username that resolves to the account email.
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run

create table if not exists public.login_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint login_profiles_username_format check (
    username ~ '^[a-z][a-z0-9_]{2,19}$'
  )
);

create unique index if not exists login_profiles_username_uidx
  on public.login_profiles (username);

alter table public.login_profiles enable row level security;

drop policy if exists "login_profiles_select_own" on public.login_profiles;
drop policy if exists "login_profiles_insert_own" on public.login_profiles;
drop policy if exists "login_profiles_update_own" on public.login_profiles;
drop policy if exists "login_profiles_delete_own" on public.login_profiles;

create policy "login_profiles_select_own" on public.login_profiles
  for select using (auth.uid() = user_id);

create policy "login_profiles_insert_own" on public.login_profiles
  for insert with check (auth.uid() = user_id);

create policy "login_profiles_update_own" on public.login_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "login_profiles_delete_own" on public.login_profiles
  for delete using (auth.uid() = user_id);

-- Resolve username → email for sign-in (no auth required).
-- Returns null when unknown; client should show a generic error.
create or replace function public.resolve_login_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_normalized text;
begin
  v_normalized := lower(trim(p_username));
  if v_normalized is null or v_normalized = '' then
    return null;
  end if;

  select u.email into v_email
  from public.login_profiles p
  join auth.users u on u.id = p.user_id
  where p.username = v_normalized
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_username(text) from public;
grant execute on function public.resolve_login_username(text) to anon, authenticated;
