# Project Context

## Purpose

Personal side project to track daily food intake and weight over time. Primary goal is learning: understand programming basics and how to build an app or website through small, weekly improvements.

## Product Goal

A personal PWA to log meals (initially manual, later via photo), see daily calorie totals, and review weekly/monthly trends alongside weight progress.

## Initial Decisions

- **User model:** Single user
- **Sync:** Local-first in the browser; cloud sync deferred
- **Data entry:** Manual confirm with ability to edit before saving
- **Weight:** Manual entry to start
- **AI / APIs:** TBD; prefer free-tier options when added
- **Locale:** English UI; metric units (kg, kcal)
- **Scope:** Start without a backend — something usable in the browser first

## Approach

Iterate in small steps. Validate the core loop (log → review → see totals → see trends) before adding complexity such as vision APIs, server endpoints, or cloud storage.

## Likely Evolution (non-binding)

1. **v0** — Manual meal logging, local persistence, daily/weekly/monthly views, weight chart, optional photo attach (no analysis)
2. **v1** — Photo → estimated calories via a vision API, with review/edit step; minimal server or serverless for API keys
3. **v2** — Cloud sync and photo backup across devices
4. **Later** — Targets, reminders, health integrations, barcode scan, export — as needed

## Stack (starting point, not fixed)

Vite + React + TypeScript, local storage (e.g. IndexedDB), charts for trends, PWA when ready. Other choices remain open as the project grows.

## Notes for Future Work

- Decisions here are defaults, not constraints — revisit when learning or requirements shift.
- Favor working software over perfect architecture.
- Each weekly increment should teach something concrete (UI, data, charts, APIs, deploy, etc.).
