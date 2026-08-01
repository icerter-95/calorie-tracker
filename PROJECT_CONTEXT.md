# Project Context

## Purpose

Personal side project to track daily food intake and weight over time. Primary goal is learning: understand programming basics and how to build an app or website through small, weekly improvements.

## Product Goal

A personal PWA to log meals (initially manual, later via photo), see daily calorie totals, and review weekly/monthly trends alongside weight progress.

## Current Decisions

- **User model:** Multi-account ready; email/password + display name (auth metadata)
- **Sync:** Cloud via Supabase (Postgres + Auth + RLS)
- **Meal shape:** Meal container with optional plate `description` / `photo_url`, JSON `items`, and macro totals (calories, protein, carbs, fat)
- **Settings:** Theme + daily calorie goal in localStorage; health connection stubs on User tab
- **Data entry:** Manual confirm with ability to edit before saving
- **Weight:** Manual entry
- **AI / APIs:** TBD; prefer free-tier options when added
- **Locale:** English UI; metric units (kg, kcal, grams)
- **Hosting:** GitHub Pages (static) + Supabase backend

## Approach

Iterate in small steps. Core loop: log → review → see totals → see trends. Cloud auth/sync is in place; photo AI and offline cache can follow.

## Likely Evolution (non-binding)

1. **v0** — Manual meal logging, local persistence _(replaced)_
2. **v1 (current)** — Cloud sync, email login, macros, plate or itemized meals (JSON items)
3. **v1.1** — Photo attach / vision API for estimated nutrition
4. **v2** — Offline cache (Dexie) + realtime; optional normalize `meal_items` table
5. **Later** — Targets, reminders, health integrations, barcode scan, export

## Stack

Vite + React + TypeScript, Supabase, Tailwind, Recharts, React Router. PWA when ready.

## Notes for Future Work

- Decisions here are defaults, not constraints — revisit when learning or requirements shift.
- Favor working software over perfect architecture.
- Each weekly increment should teach something concrete (UI, data, charts, APIs, deploy, etc.).
