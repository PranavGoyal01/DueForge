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
-   Schedule reconciliation shipped (`/api/schedule/reconcile`) with external conflict scoring + planner diagnostics panel.
-   In-app + email nudge templates shipped via shared renderer (`src/lib/nudges.ts`) and dispatch integration (`/api/jobs/nudges/dispatch`).
-   Accountability metrics dashboard shipped on `/today` (on-time completion, proof rate, current streak, best streak over 90 days).

## Active Slices

-   `capture`: improve natural-language due-date parser coverage in quick capture.
-   `stability`: add baseline observability + error-boundary coverage for beta.
-   `telemetry`: expand activation + retention funnel instrumentation beyond nudge/check-in flows.

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
