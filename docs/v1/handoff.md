# DueForge v1 Handoff

Last updated: 2026-03-24

## Current Status

-   Tester readiness: ready for pilot invites.
-   Production deployment: healthy on `dueforge.com`.
-   Core loops validated in production: auth, capture, commitment, proof, check-ins, cron jobs.
-   Remaining caution: run one manual browser pass of Google OAuth callback + apply/reconcile before increasing tester volume.

## Product Surface

-   Public: `/`, `/demo`, `/login`, `/forgot-password`, `/reset-password`
-   Authenticated: `/today`, `/commitments`, `/checkins`, `/schedule`, `/settings`, `/feature-requests`
-   Operations APIs: `/api/jobs/drift-scan`, `/api/jobs/nudges/dispatch`

## Required Environment Variables

-   `DATABASE_URL` (Supabase transaction pooler `:6543`)
-   `DIRECT_URL` (Supabase session pooler `:5432`)
-   `AUTH_SECRET`
-   `CRON_SECRET`
-   `APP_BASE_URL`
-   `SMTP_HOST`
-   `SMTP_PORT`
-   `SMTP_USER`
-   `SMTP_PASS`
-   `SMTP_FROM_EMAIL`
-   `GOOGLE_CLIENT_ID`
-   `GOOGLE_CLIENT_SECRET`
-   `GOOGLE_REDIRECT_URI`
-   `DUEFORGE_DEDICATED_CALENDAR_NAME`
-   Optional: `FEATURE_REQUEST_RECIPIENT`

## Quality Gates

-   `npm run lint`
-   `npm run typecheck`
-   `npm run build`
-   `npm run deploy:check`
-   `npm run pilot:cron-check`

## Operations Notes

-   Cron cadence in `vercel.json` is daily and Hobby-safe.
-   `0 1 * * *` -> drift scan
-   `0 3 * * *` -> nudge dispatch
-   Founder inbox is in `/feature-requests` and should be reviewed daily during pilot.
-   Use `docs/v1/pilot-operations.md` as the execution runbook.

## Canonical Docs

-   Product and operations state: `docs/v1/handoff.md`
-   Pilot execution runbook: `docs/v1/pilot-operations.md`
-   Infra setup and deployment: `docs/v1/vercel-supabase-setup.md`
-   Product direction: `docs/v1/strategy.md`
