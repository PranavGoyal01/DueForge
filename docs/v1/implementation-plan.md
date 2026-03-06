# DueForge v1 Implementation Plan

## Build Order

1. Infrastructure hardening and environment validation.
2. Domain contracts and validation surfaces.
3. Accountability flow refinements.
4. Scheduling quality and reliability.
5. Telemetry and beta feedback loops.

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
