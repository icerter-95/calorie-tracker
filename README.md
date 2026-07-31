# Calorie Tracker

Personal meal and weight tracker (v0). Data stays in your browser via IndexedDB.

## Prerequisites

Install [Node.js](https://nodejs.org/) (LTS, v20+ recommended).

## Run locally

```bash
cd calorie-tracker
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## What works in v0

- **Today** — Add, edit, and delete meals with multiple food items (manual kcal entry)
- **History** — Weekly and monthly calorie charts with optional weight overlay
- **Weight** — Log, edit, and delete weight entries (kg) with a trend chart
- **User** — Profile placeholder, theme (light/dark/system), calorie goal, health connections, local data tools

## Stack

Vite · React · TypeScript · Tailwind CSS · Dexie · Recharts · React Router

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for goals and roadmap.
