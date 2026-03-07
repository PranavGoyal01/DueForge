# DueForge v1 Backlog

## Milestone 1 - Foundation and Core Tasking (Week 1-2)

- [x] Migrate Prisma datasource from SQLite to Supabase Postgres.
- [x] Add environment validation for production-critical keys.
- [x] Stabilize auth and account email flows.
- [x] Ship initial task and commitment CRUD hardening with shared request schemas.
- [ ] Improve quick capture parser coverage for natural due-date phrasing.

## Milestone 2 - Accountability Core (Week 3-4)

- [x] Add commitment feed filtering (`today`, `week`, `at_risk`) and live commitments hub page.
- [x] Add stronger proof submission validation via shared contracts.
- [ ] Add structured daily and weekly check-in templates.
- [ ] Build drift scanner rules and nudge eligibility states.
- [ ] Add in-app plus Brevo nudge templates.

## Milestone 3 - Scheduling and Calendar (Week 5)

- [ ] Add free/busy conflict scoring for schedule suggestions.
- [ ] Persist scheduling rationale and confidence on suggested blocks.
- [ ] Improve apply-to-calendar reliability and retry handling.
- [ ] Add schedule reconciliation when external event conflicts appear.

## Milestone 4 - Beta Readiness (Week 6)

- [ ] Add accountability metrics dashboard (on-time, proof rate, streaks).
- [ ] Add event telemetry for activation and retention funnels.
- [ ] Add baseline observability and error boundary coverage.
- [ ] Run launch checklist and pilot feedback loop.

## Growth + Landing (In Progress)

- [x] Launch public hero landing at `/`.
- [x] Add live demo mode at `/demo`.
- [x] Add request-a-feature form with `/api/feature-requests` endpoint.
- [ ] Add feature request admin inbox view in-app for founder workflow.

## Next 3 Execution Slices

1. Replace `/checkins` placeholder with real schedule + create flow.
2. Replace `/schedule` placeholder with real suggested block history and apply-state diagnostics.
3. Add recurring drift scan and nudge dispatch jobs (cron + reminder pipeline).

## Excluded from v1

- Native mobile apps.
- Enterprise-grade roles and permissions.
- Additional deep integrations beyond Google Calendar.
- Autonomous agents making irreversible decisions without user review.
