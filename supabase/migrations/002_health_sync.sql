-- Health sync: steps, weight source metadata, personal sync tokens.
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run

-- Weight: where the reading came from + when Health last wrote it
alter table public.weights
  add column if not exists source text not null default 'manual';

alter table public.weights
  add column if not exists synced_at timestamptz;

alter table public.weights
  drop constraint if exists weights_source_check;

alter table public.weights
  add constraint weights_source_check
  check (source in ('manual', 'apple-health'));

-- One Apple Health weight row per user per day (manual rows stay unlimited)
create unique index if not exists weights_user_date_apple_health_uidx
  on public.weights (user_id, date)
  where source = 'apple-health';

-- Daily steps (one row per user per day)
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

alter table public.steps enable row level security;

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

-- Personal Shortcut sync token (store SHA-256 hex hash only; plaintext shown once in app)
create table if not exists public.health_sync_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null,
  token_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.health_sync_tokens enable row level security;

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
