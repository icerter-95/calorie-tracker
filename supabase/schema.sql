-- Calorie Tracker — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query → Run

-- Meals: one row per logged meal. Food lines live in `items` (JSONB).
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text,
  photo_url text,
  items jsonb not null default '[]'::jsonb,
  ingredients text[] not null default '{}'::text[],
  total_calories integer not null default 0,
  protein_g numeric(8, 1) not null default 0,
  carbs_g numeric(8, 1) not null default 0,
  fat_g numeric(8, 1) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists meals_user_date_idx on public.meals (user_id, date);
create index if not exists meals_user_created_idx on public.meals (user_id, created_at desc);
create index if not exists meals_ingredients_gin_idx on public.meals using gin (ingredients);

-- Weight entries (manual can have multiple per day; apple-health is one per day)
create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(6, 2) not null,
  source text not null default 'manual' check (source in ('manual', 'apple-health')),
  synced_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists weights_user_date_idx on public.weights (user_id, date);
create unique index if not exists weights_user_date_apple_health_uidx
  on public.weights (user_id, date)
  where source = 'apple-health';

-- Daily step totals (one row per user per day)
create table if not exists public.steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  steps integer not null check (steps >= 0),
  source text not null default 'apple-health'
    check (source in ('apple-health', 'manual')),
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists steps_user_date_idx on public.steps (user_id, date);

-- Personal Shortcut sync token (SHA-256 hash only)
create table if not exists public.health_sync_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null,
  token_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Quick login username (maps to auth email at sign-in)
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

-- Row Level Security: each user only sees their own rows
alter table public.meals enable row level security;
alter table public.weights enable row level security;
alter table public.steps enable row level security;
alter table public.health_sync_tokens enable row level security;
alter table public.login_profiles enable row level security;

drop policy if exists "meals_select_own" on public.meals;
drop policy if exists "meals_insert_own" on public.meals;
drop policy if exists "meals_update_own" on public.meals;
drop policy if exists "meals_delete_own" on public.meals;

create policy "meals_select_own" on public.meals
  for select using (auth.uid() = user_id);

create policy "meals_insert_own" on public.meals
  for insert with check (auth.uid() = user_id);

create policy "meals_update_own" on public.meals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meals_delete_own" on public.meals
  for delete using (auth.uid() = user_id);

drop policy if exists "weights_select_own" on public.weights;
drop policy if exists "weights_insert_own" on public.weights;
drop policy if exists "weights_update_own" on public.weights;
drop policy if exists "weights_delete_own" on public.weights;

create policy "weights_select_own" on public.weights
  for select using (auth.uid() = user_id);

create policy "weights_insert_own" on public.weights
  for insert with check (auth.uid() = user_id);

create policy "weights_update_own" on public.weights
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "weights_delete_own" on public.weights
  for delete using (auth.uid() = user_id);

drop policy if exists "steps_select_own" on public.steps;
drop policy if exists "steps_insert_own" on public.steps;
drop policy if exists "steps_update_own" on public.steps;
drop policy if exists "steps_delete_own" on public.steps;

create policy "steps_select_own" on public.steps
  for select using (auth.uid() = user_id);

create policy "steps_insert_own" on public.steps
  for insert with check (auth.uid() = user_id);

create policy "steps_update_own" on public.steps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "steps_delete_own" on public.steps
  for delete using (auth.uid() = user_id);

drop policy if exists "health_sync_tokens_select_own" on public.health_sync_tokens;
drop policy if exists "health_sync_tokens_insert_own" on public.health_sync_tokens;
drop policy if exists "health_sync_tokens_update_own" on public.health_sync_tokens;
drop policy if exists "health_sync_tokens_delete_own" on public.health_sync_tokens;

create policy "health_sync_tokens_select_own" on public.health_sync_tokens
  for select using (auth.uid() = user_id);

create policy "health_sync_tokens_insert_own" on public.health_sync_tokens
  for insert with check (auth.uid() = user_id);

create policy "health_sync_tokens_update_own" on public.health_sync_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "health_sync_tokens_delete_own" on public.health_sync_tokens
  for delete using (auth.uid() = user_id);

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
