# KIVO — Creative Studio

Public KIVO studio website with a private, admin-only operating dashboard.

## Stack
- React + Vite frontend
- Express API deployed as a Vercel Function
- Supabase PostgreSQL (server-side service-role client only)
- HMAC-signed, HttpOnly admin session cookie

## Local development
1. Install Node.js 20+
2. Run `npm install`
3. Copy `.env.example` to `.env` and set the environment variables.
4. Run `npm run dev`

## Supabase setup
1. Create the five tables using the KIVO SQL schema previously supplied in the Supabase SQL Editor.
2. Run `supabase/production-security.sql` in the SQL Editor.
3. In Supabase Project Settings → API Keys, copy the **service_role secret** (or the current secret key with server-side privileges). Never put it in frontend code, GitHub, or a public message.

## Vercel deployment
1. Import `mohammednaji20/KIVO` into Vercel.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Add these Environment Variables for Production (and Preview if desired):
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase server-only service-role secret
   - `SESSION_SECRET` = a cryptographically random value of at least 32 characters
   - `ADMIN_PASSWORD` = a unique password of at least 12 characters
   - `NODE_ENV` = `production`
4. Deploy. Vercel assigns a temporary `*.vercel.app` URL.
5. Test `/api/health`, public homepage, `/admin`, login, and protected endpoints.

## Security
- The service-role key is server-only. Never prefix it with `VITE_`.
- RLS is enabled on all application tables. Anonymous users can read public settings and active services only.
- Leads, projects, and transactions have no public access policies.
- Admin API routes require the signed admin cookie.
- The dashboard is not a public signup system; there is one server-configured admin password.

## Notes
- Existing SQLite data is not migrated automatically. Export/import any records you need to preserve before removing the old database.
- The Vercel deployment itself must be connected and configured in the Vercel account; this repository change does not deploy it automatically.
