# Vercel + Supabase Setup Guide

## Required Software

- Node.js 20 LTS
- npm 10+
- GitHub account
- Vercel account
- Supabase account
- Optional: Vercel CLI (`npm i -g vercel`)
- Optional: Supabase CLI (`npm i -g supabase`)

## 1. Create Supabase Project

1. In Supabase, create a new project in your preferred region.
1. In Supabase, open `Project Settings -> Database -> Connection pooling`.
1. Copy the pooler connection string (port `6543`).
1. Replace placeholders in `.env`:

```dotenv
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
```

Use `DATABASE_URL` for app/runtime and `DIRECT_URL` for Prisma schema operations.

1. Run schema sync locally:

```bash
npm run db:generate
npm run db:push
```

Use this when you need a totally clean schema:

1. In Supabase SQL Editor, run `prisma/reset-public-schema.sql`.
1. Re-apply schema from Prisma with `npm run db:push`.
1. Optional: inspect SQL first with `npm run db:bootstrap-sql`.

## 2. Configure Auth Secret

Generate a strong secret (32+ chars) and set:

```dotenv
AUTH_SECRET="<long-random-secret>"
```

## 3. Configure Brevo SMTP

Set these values from Brevo SMTP settings:

```dotenv
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="<brevo-user>"
SMTP_PASS="<brevo-password>"
SMTP_FROM_EMAIL="<verified-sender@yourdomain.com>"
FEATURE_REQUEST_RECIPIENT="<your-inbox@yourdomain.com>"
```

`FEATURE_REQUEST_RECIPIENT` is optional and routes demo feature requests to your email when set.

## 4. Configure Google OAuth

In Google Cloud Console:

1. Create OAuth client (Web application).
1. Add redirect URIs:

- Local: `http://localhost:3000/api/integrations/google/callback`
- Prod: `https://<your-domain>/api/integrations/google/callback`

1. Set env vars:

```dotenv
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/google/callback"
```

For production, update `GOOGLE_REDIRECT_URI` to your domain callback URL.

## 5. Deploy to Vercel

1. Import repository into Vercel.
1. Set framework preset to Next.js.
1. Add all env vars from `.env` in Vercel Project Settings.
1. Configure production values:

```dotenv
APP_BASE_URL="https://<your-domain>"
GOOGLE_REDIRECT_URI="https://<your-domain>/api/integrations/google/callback"
```

1. Deploy.

## 6. Configure Vercel Cron (Secure)

DueForge includes `vercel.json` cron entries:

- `0 1 * * *` -> `GET /api/jobs/drift-scan`
- `0 3 * * *` -> `GET /api/jobs/nudges/dispatch`

Hobby plan compatibility:

- Vercel Hobby only allows cron schedules that run once per day.
- DueForge uses two daily jobs spaced two hours apart to preserve execution order (scan first, dispatch second) even with Hobby timing drift.
- Hobby timing is hourly precision; execution may happen up to 59 minutes after the scheduled minute.

Security requirements:

- Set `CRON_SECRET` in Vercel Environment Variables (Production).
- Vercel sends this as `Authorization: Bearer <CRON_SECRET>`.
- Job routes reject unauthenticated requests unless there is a valid session cookie (manual run from `/settings`) or valid cron bearer token.
- Job routes support both `GET` (cron) and `POST` (manual/API trigger).

Recommended values:

```dotenv
CRON_SECRET="<32+ char random secret>"
```

Local cron verification from terminal:

```bash
curl -i http://localhost:3000/api/jobs/drift-scan
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/jobs/drift-scan
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/jobs/nudges/dispatch
```

Expected behavior:

- No auth header -> `401 Unauthorized`
- Valid bearer token -> `200` JSON payload

## 7. Post-Deploy Checks

- Open `/api/health` and verify success.
- Open `/` and confirm hero landing loads correctly.
- Open `/demo` and submit a feature request form entry.
- Register a test user and verify email delivery.
- Connect Google Calendar and run suggest/apply schedule once.
- Login and confirm authenticated app routes to `/today`.
- Open `/commitments` and submit proof on at least one commitment.
- Open `/settings` and confirm environment checklist shows `CRON_SECRET configured: Yes`.
- In `/settings`, run `Run Drift Scan`, then `Dispatch Nudges`, and confirm non-error responses.

## 8. Deployment Security + Sanity Checklist

- `AUTH_SECRET` is long/random and never checked into git.
- `CRON_SECRET` is set in Vercel and not reused from other services.
- `DATABASE_URL` uses Supabase pooler `:6543` for runtime.
- `DIRECT_URL` uses Supabase pooler `:5432` for Prisma schema operations.
- `APP_BASE_URL` and `GOOGLE_REDIRECT_URI` exactly match production domain.
- SMTP sender domain is verified and `SMTP_FROM_EMAIL` matches that domain.
- At least one protected dashboard route (`/today`) redirects to `/login` when signed out.
- `/api/health` responds `ok: true`.
- `npm run build` succeeds on the deployment branch before release.
- `npm run deploy:check` passes against your target deployment base URL.

## 9. Add Vercel Deployment Checks

DueForge includes GitHub Actions CI workflow at `.github/workflows/ci.yml` with one required status job:

- `quality-gate` (runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm run db:generate`, `npm run build`)

Notes:

- Vercel project env vars are not available inside GitHub Actions.
- The workflow defines non-secret placeholder env vars at job level so `next build` and Prisma client generation pass during CI.
- Keep real production secrets only in Vercel (and optionally GitHub Secrets for workflows that actually need live credentials).

Optional additional PR guard:

- `.github/workflows/dependency-review.yml` blocks known-vulnerable or risky dependency changes on pull requests.

To enforce in Vercel:

1. Push the workflow to GitHub default branch.
2. Open Vercel Project -> Settings -> Deployments -> Deployment Checks.
3. Click `Add Checks` and select GitHub as provider.
4. Select the CI status check for the workflow job (`CI / quality-gate`).
5. Save. Vercel will block promotion until this check is green.

## 10. Recommended Next Hardening

- Add Sentry (or equivalent) for production exception monitoring.
- Add `npm run db:migrate:deploy` to deployment workflow when you start migrations.

## 11. Current Production Route Map

- Public landing: `/`
- Live demo mode: `/demo`
- Auth entry: `/login`
- Authenticated command center: `/today`
- Authenticated commitments hub: `/commitments`
