-- One-time safety net BEFORE turning on "Confirm email" in the dashboard.
-- Marks existing accounts as already verified so they can keep signing in.
-- Does not change passwords, meals, weights, steps, photos, or sessions.
-- Safe to run more than once.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Then: Authentication → Providers → Email → Confirm email → ON

update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;
