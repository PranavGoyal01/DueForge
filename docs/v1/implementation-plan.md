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

## Active Slices

- `checkins`: replace placeholder page with real list + create + partner context.
- `schedule`: expose real suggestion/apply diagnostics and confidence/risk signals.
- `settings`: add integration health and environment diagnostics for beta operations.

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
