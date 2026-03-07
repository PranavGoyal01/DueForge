# DueForge v1 Handoff

Last updated: 2026-03-07

## Current Product State

- Public hero landing is live at `/`.
- Live demo mode is live at `/demo`.
- Authenticated product entry is `/today`.
- Commitments hub is data-backed at `/commitments`.
- Check-ins page is data-backed at `/checkins` including past history visibility.
- Schedule page is data-backed at `/schedule` with apply diagnostics.
- Settings diagnostics page is live at `/settings`.
- Manual operations controls are available in `/settings` for drift scan + nudge dispatch.
- Vercel cron schedule is configured via `vercel.json` for drift scan + nudge dispatch.
- Cron cadence is Hobby-safe daily execution (`0 1 * * *` drift scan, `0 3 * * *` dispatch).
- Feature request intake is live at `/api/feature-requests` and can forward to `FEATURE_REQUEST_RECIPIENT`.

## Critical Configuration Decisions

- Prisma runtime traffic: `DATABASE_URL` (Supabase transaction pooler, `:6543`).
- Prisma schema operations (`db:push`/migrate): `DIRECT_URL` (Supabase session pooler, `:5432`).
- Avoid direct DB host path for local commands if it hangs or requires paid IPv4 add-on.

## Environment Variables You Must Have

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `CRON_SECRET`
- `APP_BASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `DUEFORGE_DEDICATED_CALENDAR_NAME`
- Optional: `FEATURE_REQUEST_RECIPIENT`

## What Was Completed Recently

- Landing + dashboard route split (`/` vs `/today`).
- Supabase pooler dual-url strategy documented and implemented.
- Shared request contract wiring across key API routes.
- Demo feature request form + API route + telemetry + optional email forwarding.
- Commitments page upgraded from placeholder to real data view.
- Check-ins page upgraded from placeholder to real list/create + past history view.
- Schedule page upgraded from placeholder to real planner + applied-block diagnostics.
- Settings page upgraded from placeholder to user-testing diagnostics checklist.
- Drift-scan + nudge-dispatch API jobs are live (`/api/jobs/drift-scan`, `/api/jobs/nudges/dispatch`).
- Job routes accept secure cron bearer auth (`CRON_SECRET`) and support Vercel cron GET invocations.

## Highest-Priority Next Work

1. Validate daily Hobby cron behavior in production logs and tune times as needed.
2. Capture schedule apply failures with per-block status visibility for easier debugging.
3. Add structured check-in outcome capture/edit flow (not just schedule).
4. Add founder-facing in-app feature request inbox (optional if email inbox remains sufficient).

## Fast Restart Commands

```bash
npm install
npm run db:generate
npm run lint
npm run build
npm run dev
```

## Recommended First Reads For New Session

1. `docs/v1/handoff.md`
2. `docs/v1/backlog.md`
3. `docs/v1/implementation-plan.md`
4. `docs/v1/vercel-supabase-setup.md`
5. `README.md`
