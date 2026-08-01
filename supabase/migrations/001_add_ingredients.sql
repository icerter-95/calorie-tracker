-- Ingredient tags for search/insights (presence only — no calorie split).
-- Run in: Supabase Dashboard → SQL Editor → New query → Run

alter table public.meals
  add column if not exists ingredients text[] not null default '{}'::text[];

create index if not exists meals_ingredients_gin_idx
  on public.meals using gin (ingredients);
