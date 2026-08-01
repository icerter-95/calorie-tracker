# Calorie Tracker

Personal meal and weight tracker with **cloud sync** (Supabase), email/password login, and a User tab for theme, goals, and account tools.

## Prerequisites

- [Node.js](https://nodejs.org/) LTS (v20+)
- A free [Supabase](https://supabase.com) project

## One-time Supabase setup (required)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → New query → paste and run [`supabase/schema.sql`](./supabase/schema.sql).
3. Open **Project Settings → API Keys** and copy:
   - Project URL (often under **Data API** / **Connect**)
   - **Publishable** key (`sb_publishable_…`) — or legacy `anon` key
4. Auth settings (recommended for personal use):
   - **Authentication → Providers → Email** enabled
   - **Confirm email**: turn **off** so signup works immediately
5. Optional: **Authentication → URL Configuration** — add:
   - `http://localhost:5173/calorie-tracker/`
   - `https://icerter-95.github.io/calorie-tracker/`

## Run locally

```bash
cd calorie-tracker
cp .env.example .env.local
# edit .env.local with your Supabase URL + publishable/anon key
npm install
npm run dev
```

Open the **Local** URL from the terminal (include `/calorie-tracker/`).

1. **Sign up** with name, email, and password  
2. Add meals / weight — data is stored in Supabase  
3. Use **User** to edit name, theme, calorie goal, load sample data, or sign out  

## GitHub Pages deploy

Add repository secrets (Settings → Secrets and variables → Actions):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable or anon key)

Push to `main`; the existing workflow builds with those env vars.

## What works

- **Login** — email + password; display name at signup (editable in User)
- **Today** — meals with plate description and/or items + macros; goal remaining + macros summary
- **History** — weekly/monthly calorie charts + weight overlay
- **Weight** — log/edit/delete weight entries
- **User** — profile/name, theme, calorie goal, health stubs, sample/clear cloud data, sign out

## Stack

Vite · React · TypeScript · Tailwind CSS · Supabase (Postgres + Auth) · Recharts · React Router

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for goals and roadmap.
