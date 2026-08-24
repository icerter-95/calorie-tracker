-- Saved meals (favorites) the user can log again later.
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- if this migration was not applied by the CLI.

create table if not exists public.favorite_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  photo_url text,
  ingredients text[] not null default '{}'::text[],
  total_calories integer not null default 0,
  protein_g numeric(8, 1) not null default 0,
  carbs_g numeric(8, 1) not null default 0,
  fat_g numeric(8, 1) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists favorite_meals_user_created_idx
  on public.favorite_meals (user_id, created_at desc);

alter table public.favorite_meals enable row level security;

drop policy if exists "favorite_meals_select_own" on public.favorite_meals;
drop policy if exists "favorite_meals_insert_own" on public.favorite_meals;
drop policy if exists "favorite_meals_update_own" on public.favorite_meals;
drop policy if exists "favorite_meals_delete_own" on public.favorite_meals;

create policy "favorite_meals_select_own" on public.favorite_meals
  for select using (auth.uid() = user_id);

create policy "favorite_meals_insert_own" on public.favorite_meals
  for insert with check (auth.uid() = user_id);

create policy "favorite_meals_update_own" on public.favorite_meals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "favorite_meals_delete_own" on public.favorite_meals
  for delete using (auth.uid() = user_id);
