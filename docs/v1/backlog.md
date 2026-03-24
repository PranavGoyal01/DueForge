# DueForge v1 Backlog

## Milestone 1 - Foundation and Core Tasking (Week 1-2)

- [x] Migrate Prisma datasource from SQLite to Supabase Postgres.
- [x] Add environment validation for production-critical keys.
- [x] Stabilize auth and account email flows.
- [x] Ship initial task and commitment CRUD hardening with shared request schemas.
- [x] Improve quick capture parser coverage for natural due-date phrasing.

## Milestone 2 - Accountability Core (Week 3-4)

- [x] Add commitment feed filtering (`today`, `week`, `at_risk`) and live commitments hub page.
- [x] Add stronger proof submission validation via shared contracts.
- [x] Add structured daily and weekly check-in templates.
- [x] Build drift scanner rules and nudge eligibility states.
- [x] Add in-app plus Brevo nudge templates.

## Milestone 3 - Scheduling and Calendar (Week 5)

- [x] Add free/busy conflict scoring for schedule suggestions.
- [x] Persist scheduling rationale and confidence on suggested blocks.
- [x] Improve apply-to-calendar reliability and retry handling.
- [x] Add schedule reconciliation when external event conflicts appear.

## Milestone 4 - Beta Readiness (Week 6)

- [x] Add accountability metrics dashboard (on-time, proof rate, streaks).
- [x] Add baseline observability and error boundary coverage.
- [x] Add event telemetry for activation and retention funnels.
- [ ] Run launch checklist and pilot feedback loop.

## Pre-Tester Blocking Checklist

- [ ] Confirm production environment variables in Vercel are complete and valid (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `CRON_SECRET`, `APP_BASE_URL`, SMTP, Google OAuth).
- [ ] Verify auth account flows in production (`register`, `verify-email`, `login`, `forgot-password`, `reset-password`).
- [ ] Verify Google Calendar happy path end-to-end (connect -> suggest -> apply -> reconcile) for one real user account.
- [ ] Run cron dry-runs and one controlled live run (`drift-scan`, `nudges/dispatch`) and verify expected `runId` telemetry without reminder duplication spikes.
- [x] Confirm feature request triage loop is operational in-app (`/feature-requests`) and inbox handling owner/SLA is defined.
- [x] Persist anonymous feature requests into durable storage (not logs-only) so tester feedback is fully captured.
- [x] Publish tester script and feedback form template for pilot participants.
- [x] Define pilot go/no-go thresholds for first week (activation, proof rate, scheduler adoption, critical bug budget).

## Growth + Landing (In Progress)

- [x] Launch public hero landing at `/`.
- [x] Add live demo mode at `/demo`.
- [x] Add request-a-feature form with `/api/feature-requests` endpoint.
- [x] Add feature request admin inbox view in-app for founder workflow.

## Next 3 Execution Slices

1. Execute launch checklist and pilot onboarding script.
2. Verify telemetry baselines after first pilot cohort and tune cron windows.
3. Define pilot go/no-go thresholds after baseline telemetry collection.

## Excluded from v1

- Native mobile apps.
- Enterprise-grade roles and permissions.
- Additional deep integrations beyond Google Calendar.
- Autonomous agents making irreversible decisions without user review.
