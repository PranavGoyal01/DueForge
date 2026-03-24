# DueForge v1 Implementation Plan

## Build Order

1. Infrastructure hardening and environment validation.
2. Domain contracts and validation surfaces.
3. Accountability flow refinements.
4. Scheduling quality and reliability.
5. Telemetry and beta feedback loops.

## Completed Slices

- Root route split complete: public landing at `/`, authenticated app at `/today`.
- Supabase + Prisma dual URL connectivity strategy implemented (`DATABASE_URL` + `DIRECT_URL`).
- Shared API contract wiring in core routes (`tasks`, `commitments`, `checkins`, `proof`).
- Feature request loop shipped (`/demo` form -> `/api/feature-requests` -> optional email forward).
- Commitments hub upgraded from placeholder to real data page.
- Check-ins page upgraded from placeholder to real list/create/history flow.
- Schedule page upgraded from placeholder to planner with apply diagnostics.
- Settings page upgraded from placeholder to diagnostics + manual ops controls.
- Drift-scan and nudge-dispatch jobs shipped with cron-safe route auth.
- Dashboard UI migrated to shadcn-style shared components (`MetricCard`, `SectionHeader`, core forms/panels).
- Structured check-in outcome capture/edit shipped on `/checkins` history with authenticated `PATCH /api/checkins/[id]`.
- Per-block schedule apply diagnostics + retry hooks shipped (`/api/schedule/apply` and `SchedulePlanner` retry flows).
- Schedule suggestion rationale + confidence persistence shipped (`/api/schedule/suggest` -> `activity_events`) with planner confidence rendering.
- Nudge + check-in funnel telemetry instrumentation shipped (`checkin.timeline.viewed`, `checkin.scheduled`, `checkin.outcome.logged`, `nudge.sent`, `nudge.failed`, `nudge.dispatch.completed`).
- Schedule reconciliation shipped (`/api/schedule/reconcile`) with external conflict scoring + planner diagnostics panel.
- In-app + email nudge templates shipped via shared renderer (`src/lib/nudges.ts`) and dispatch integration (`/api/jobs/nudges/dispatch`).
- Accountability metrics dashboard shipped on `/today` (on-time completion, proof rate, current streak, best streak over 90 days).
- Quick-capture parser coverage expanded for natural due-date phrases (`today/tomorrow/next week`, `in N days/weeks`, weekdays, month names, slash dates, and time hints like `5pm`, `17:30`, `eod`).
- Baseline observability + error boundary coverage shipped with global/app/dashboard boundaries and request-id error reporting in key schedule/check-in APIs.
- Activation + retention telemetry instrumentation shipped across auth and lifecycle milestones (`auth.registered`, `auth.login.succeeded/failed`, `auth.email.verified`, task/commitment/proof activation markers, and task/commitment retention views).
- Cron validation + tuning controls shipped for drift scan and nudge dispatch with `runId`, `durationMs`, bounded query params (`limit`, `lookbackHours`, `horizonHours`, `duplicateWindowHours`), and `dryRun=1` support from settings ops panel.
- Founder-facing feature request inbox shipped at `/feature-requests` with dashboard navigation and settings quick-link for triage.
- Durable feature request persistence shipped for both authenticated and anonymous submissions via Prisma `FeatureRequest`, with founder inbox updated to a unified triage queue and legacy event fallback.

## Active Slices

- `launch-readiness`: run launch checklist and pilot feedback loop.
- `post-pilot-telemetry`: verify baseline funnel and cron telemetry after first pilot cohort.
- `pilot-metrics-gates`: define week-1 go/no-go thresholds from first cohort baselines.

## Definition Of Ready For Testers

All items below should be complete before inviting external testers.

- [ ] Product reliability: `npm run lint`, `npm run typecheck`, and `npm run build` pass on `main`.
- [ ] Product reliability: production smoke flow passes (login -> quick capture -> commit -> proof -> check-in update).
- [ ] Integration reliability: Google Calendar flow passes in production (connect, suggest, apply, reconcile).
- [ ] Integration reliability: cron jobs validated using dry-run and controlled live run with expected telemetry output.
- [ ] Feedback capture: authenticated feature requests are visible in `/feature-requests` inbox.
- [x] Feedback capture: anonymous feature requests are durably persisted and visible in triage view.
- [x] Pilot operations: tester script and issue reporting instructions are published.
- [x] Pilot operations: triage owner and response SLA are defined for tester-reported bugs.
- [ ] Metrics: activation baseline events verified (`auth.*`, `activation.*`, `retention.*`).
- [ ] Metrics: week-1 pilot thresholds agreed (activation conversion, proof attachment rate, scheduling adoption, blocker bug ceiling).

## Launch Artifacts To Prepare

- Pilot operations manual (tester script, bug template, triage SLA, and telemetry baseline runbook) -> `docs/v1/pilot-operations.md`.
- Daily triage board for tester bugs and feature requests.
- End-of-week pilot summary template with go/no-go recommendation.

## Proposed Folder Topology

```txt
src/
  app/
    (auth)/
    (dashboard)/
      today/
      commitments/
      checkins/
      schedule/
      settings/
    api/
  components/
    ui/
    dashboard/
    tasks/
    commitments/
    checkins/
    proofs/
    schedule/
  lib/
    auth/
    db/
    domain/
    integrations/
    ai/
    validation/
    telemetry/
  styles/
    tokens.css
    theme-dark.css
```

## Engineering Principles

- Keep API contracts explicit with shared schemas.
- Prefer additive changes that do not disrupt existing stable flows.
- Ship thin vertical slices and validate behavior with real users weekly.
- Track drift early: no silent failure paths in reminders, commitments, or proofs.

## Cold-Start Checklist For New Contributor Session

1. Read `docs/v1/handoff.md` first.
2. Run `npm run lint` and `npm run build` to confirm baseline health.
3. Confirm environment uses pooler split (`DATABASE_URL` and `DIRECT_URL`).
4. Continue from the first unchecked item in `docs/v1/backlog.md`.
