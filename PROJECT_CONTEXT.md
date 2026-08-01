# Project Context

## Purpose

Personal side project to track daily food intake and weight over time. Primary goal is learning: understand programming basics and how to build an app or website through small, weekly improvements.

## Product Goal

A personal PWA to log meals (initially manual, later via photo), see daily calorie totals, and review weekly/monthly trends alongside weight progress.

## Current Decisions

- **User model:** Multi-account ready; email/password + display name (auth metadata)
- **Sync:** Cloud via Supabase (Postgres + Auth + RLS)
- **Meal shape:** Meal container with optional plate `description` / `photo_url`, JSON `items`, and macro totals (calories, protein, carbs, fat)
- **Photos:** Compressed client-side (~1280px JPEG), stored in private Supabase Storage bucket `meal-photos` (path `{user_id}/{uuid}.jpg`)
- **AI estimate:** Gemini Flash via Supabase Edge Function `estimate-meal` (whole-plate totals; user always edits before save)
- **Settings:** Theme + dual calorie goals (lower/upper) + macro goals in localStorage; health connection stubs on User tab
- **Data entry:** Manual confirm with ability to edit before saving
- **Weight:** Manual entry
- **Locale:** English UI; metric units (kg, kcal, grams)
- **Hosting:** GitHub Pages (static) + Supabase backend; Apple “Add to Home Screen” is enough for install for now

## Approach

Iterate in small steps. Core loop: log → review → see totals → see trends. Photo AI is the current focus; offline cache and design polish can follow.

## Likely Evolution (non-binding)

1. **v0** — Manual meal logging, local persistence _(replaced)_
2. **v1** — Cloud sync, email login, macros, plate or itemized meals (JSON items) _(done)_
3. **v1.1 (current)** — Photo attach + Gemini plate estimate
4. **v1.2** — Bug fixes + design improvements
5. **v2** — Offline cache (Dexie) + realtime; optional normalize `meal_items` table
6. **Later** — Targets, reminders, health integrations, barcode scan, export

## Stack

Vite + React + TypeScript, Supabase (Postgres, Auth, Storage, Edge Functions), Gemini Flash, Tailwind, Recharts, React Router.

## Notes for Future Work

- Decisions here are defaults, not constraints — revisit when learning or requirements shift.
- Favor working software over perfect architecture.
- Each weekly increment should teach something concrete (UI, data, charts, APIs, deploy, etc.).
- AI calorie numbers are estimates (~portion error from 2D photos); always confirm before save.
