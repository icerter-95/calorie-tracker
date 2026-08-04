# Calorie Tracker

Personal meal and weight tracker with **cloud sync** (Supabase), email/password login, plate photos, and optional AI nutrition estimates.

## Prerequisites

- [Node.js](https://nodejs.org/) LTS (v20+)
- A free [Supabase](https://supabase.com) project
- (For AI estimates) A free [Google AI Studio](https://aistudio.google.com/apikey) Gemini API key
- (For deploying the Edge Function) [Supabase CLI](https://supabase.com/docs/guides/cli)

## One-time Supabase setup (required)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → New query → paste and run [`supabase/schema.sql`](./supabase/schema.sql).
3. Run [`supabase/storage.sql`](./supabase/storage.sql) the same way (private `meal-photos` bucket + RLS).
4. Open **Project Settings → API Keys** and copy:
   - Project URL (often under **Data API** / **Connect**)
   - **Publishable** key (`sb_publishable_…`) — or legacy `anon` key
5. Auth settings (recommended for personal use):
   - **Authentication → Providers → Email** enabled
   - **Confirm email**: turn **off** so signup works immediately
6. Optional: **Authentication → URL Configuration** — add:
   - `http://localhost:5173/calorie-tracker/`
   - `https://icerter-95.github.io/calorie-tracker/`

## AI plate estimate (optional but recommended)

Photos can be attached without AI. To enable **Estimate from photo**:

1. Create a Gemini API key at [Google AI Studio](https://aistudio.google.com/apikey) (free tier / Flash models).
2. From this repo (logged into Supabase CLI):

```bash
cd calorie-tracker
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set GEMINI_API_KEY=your_gemini_key
npx supabase functions deploy estimate-meal
npx supabase functions deploy suggest-ingredients
```

`YOUR_PROJECT_REF` is the subdomain in your project URL (`https://YOUR_PROJECT_REF.supabase.co`).

The edge functions call `gemini-3.5-flash-lite` first, then retry and fall back across current 3.x Flash models (`gemini-3.1-flash-lite`, `gemini-3.5-flash`, `gemini-3.6-flash`) when Google returns overload (503) or a missing/unavailable model. Optional secrets: `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` (comma-separated).

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
2. **Add meal** → optional plate photo → **Estimate from photo** → edit totals → save  
3. Use **User** for theme, calorie goal, sample/clear data, or sign out  

Photos are compressed in the browser before upload (~1280px JPEG) to stay well under Supabase’s free 1 GB storage.

## GitHub Pages deploy

Add repository secrets (Settings → Secrets and variables → Actions):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable or anon key)

Push to `main`; the existing workflow builds with those env vars.  
Gemini key stays in Supabase secrets (never in GitHub/Vite env).

## What works

- **Login** — email + password; display name at signup (editable in User)
- **Diary** — weekly calendar (Mon–Sun), day meals with photo / macros; dual calorie goals + macro targets; AI plate estimate
- **History** — weekly/monthly calorie charts + weight overlay
- **Weight** — log/edit/delete weight entries
- **User** — profile/name, theme, calorie & macro goals, health stubs, sample/clear cloud data, sign out

## Stack

Vite · React · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage + Edge Functions) · Gemini Flash · Recharts · React Router

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for goals and roadmap.
