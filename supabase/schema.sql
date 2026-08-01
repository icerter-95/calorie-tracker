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

-- Weight entries
create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(6, 2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists weights_user_date_idx on public.weights (user_id, date);

-- Row Level Security: each user only sees their own rows
alter table public.meals enable row level security;
alter table public.weights enable row level security;

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
