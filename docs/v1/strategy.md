# DueForge v1 Strategy

## Product Thesis

- DueForge is an execution and accountability layer for people who struggle to follow through.
- Every feature must reduce missed deadlines, silent drift, or weak accountability loops.
- The first release should be integration-first, opinionated, and fast to ship.

## Assumptions

- Hosting stack: Vercel + Supabase Postgres.
- Transactional email: Brevo.
- Existing Google Calendar integration remains the first external integration.
- Current Next.js App Router + Prisma codebase is the delivery baseline.

## v1 Outcome Targets

- 10 to 20 weekly active beta users complete at least one commitment cycle per week.
- At least 60 percent of commitments have proof attached before due time.
- At least 50 percent of users who connect calendar apply one AI-generated plan weekly.

## User Personas

- Execution-Strained Builder: a solo founder or independent operator with high intent and inconsistent execution.
- Accountability Partner: peer, friend, or coach who can view commitments and verify progress.
- Team Operator: small team manager who needs evidence-backed progress visibility.

## Top User Journeys

1. Capture to commitment to proof to check-in.
2. Weekly plan to calendar lock to daily execution.
3. Drift detection to escalation to recommit or complete.

## Design Direction

- Dark, focused, execution-oriented interface.
- Priority and risk are visually explicit.
- Fast capture and minimum interaction cost are prioritized over customization.

## Current Product State (March 2026)

- Public marketing landing now lives at `/` with clear waitlist and demo CTAs.
- Authenticated command center lives at `/today`.
- Commitments page is now data-backed (`/commitments`), not placeholder-only.
- Demo mode is live at `/demo` and includes a feature request intake form.
- Feature request intake is wired end-to-end via `/api/feature-requests` with optional email forwarding.

## Architectural Decisions Already Locked

- Prisma uses `DATABASE_URL` (Supabase transaction pooler `:6543`) for runtime traffic.
- Prisma uses `DIRECT_URL` (Supabase session pooler `:5432`) for schema operations.
- Shared Zod contracts live in `src/lib/domain/contracts.ts` and are reused in API routes.
- Core environment validation is centralized in `src/lib/validation/env.ts`.

## Immediate Focus (Next Iterations)

- Replace remaining dashboard placeholders (`/checkins`, `/schedule`, `/settings`) with real data views.
- Add robust telemetry coverage for activation and execution funnel events.
- Add recurring drift scans and nudge dispatch to close accountability loops.
