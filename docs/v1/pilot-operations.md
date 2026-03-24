# DueForge Pilot Operations Manual

Last updated: 2026-03-22

## Purpose

Single source of truth for pilot execution: tester script, bug intake template, triage SLA, and post-cohort telemetry/cron baseline checks.

## Automation Quick Start

Run this before tester invites and during week 1 operations:

```bash
npm run pilot:cron-check
```

Optional controlled live run (mutates reminders, use intentionally):

```bash
npm run pilot:cron-check:live
```

Both commands require `APP_BASE_URL` and `CRON_SECRET` in environment.

## Part 1: Tester Script

### Session Setup (5 min)

1. Confirm tester can access the app URL and email inbox for verification/reset links.
2. Share testing window and support channel.
3. Ask tester to keep one browser tab on the app and one note for quick observations.

### Happy Path Tasks (20-30 min)

1. Account setup
   -   Register from login page.
   -   Verify email.
   -   Log in.
   -   Expected: user lands on dashboard without errors.
2. Capture and commitment loop
   -   Create one task via quick capture.
   -   Create one commitment due within 24-72 hours.
   -   Submit proof on that commitment.
   -   Expected: commitment appears in feed and proof is visible immediately.
3. Check-in loop
   -   Schedule one check-in.
   -   Add or edit a check-in outcome.
   -   Expected: check-in appears in history and updates persist.
4. Scheduling loop
   -   Connect Google Calendar.
   -   Generate schedule suggestions for at least one task.
   -   Apply at least one suggested block.
   -   Run reconcile.
   -   Expected: block is created in DueForge calendar and reconcile returns deterministic diagnostics.
5. Feedback loop
   -   Submit one feature request from demo flow.
   -   If authenticated, submit one feature request while logged in.
   -   Expected: both requests are accepted and founder inbox receives entries.

### Edge-Case Prompts (10 min)

1. Try invalid payload behavior in UI boundaries.
   -   Empty/too-short feature request fields.
   -   Missing commitment proof content.
   -   Expected: user-facing validation message, no app crash.
2. Navigate quickly across pages (`/today`, `/commitments`, `/checkins`, `/schedule`, `/settings`).
   -   Expected: no white screens, no stuck spinners.
3. Force session boundary.
   -   Log out, open protected route directly, then log back in.
   -   Expected: redirect to login when logged out, restore app after login.

### Data To Capture Per Tester

-   Tester id or initials
-   Date and timezone
-   Browser + device
-   Completed steps (yes/no)
-   Bugs found (link to bug report item)
-   Top 3 friction points
-   One feature request summary
-   Overall sentiment (1-5)

### Session Exit Questions

1. What felt unclear or high-friction?
2. Which step took the longest and why?
3. What would make you trust this for weekly execution?

### Pass/Fail Criteria

-   Pass: tester completes happy path without blocker bugs.
-   Fail: any P0/P1 issue in auth, commitment, proof, schedule apply, or app stability.

## Part 2: Bug Report Template

Use this template for every pilot bug so triage is consistent.

### Metadata

-   Title:
-   Reported by:
-   Date/time:
-   Environment: Production / Staging
-   Browser/device:
-   User type: Authenticated / Anonymous / New Signup
-   Severity: P0 / P1 / P2 / P3
-   Area: Auth / Tasks / Commitments / Proof / Check-ins / Schedule / Calendar / Notifications / Feature Requests / Other

### Summary

-   One-line description:

### Reproduction Steps

1.
2.
3.

### Expected Result

-   (describe expected behavior)

### Actual Result

-   (describe observed behavior)

### Evidence

-   Screenshot/video links:
-   Request id / run id / reference id (if available):
-   Console or network snippets:

### Impact

-   Who is blocked?
-   Scope: Single user / segment / all users
-   Workaround available? Yes/No

### Triage Notes

-   Owner:
-   Status: New / Confirmed / In Progress / Fixed / Verified / Won't Fix
-   Target fix window:
-   Linked PR/commit:
-   Verification notes:

## Part 3: Triage Owner and SLA

### Triage Owner

-   Primary owner: Pranav Goyal (`@PranavGoyal01`)
-   Backup owner: assign before inviting first external cohort

### Intake Sources

-   In-app founder inbox: `/feature-requests`
-   Direct tester messages (must be normalized into template within same day)

### Severity Definitions

-   P0: Data loss, security issue, or complete inability to use core app.
-   P1: Core journey broken without viable workaround.
-   P2: Degraded behavior with workaround available.
-   P3: Minor UI, copy, or low-impact enhancement.

### Response and Resolution Targets

-   P0: acknowledge within 30 minutes, start mitigation immediately, fix or rollback within 4 hours.
-   P1: acknowledge within 4 hours, fix within 1 business day.
-   P2: acknowledge within 1 business day, fix in next planned batch (<= 7 days).
-   P3: acknowledge within 2 business days, prioritize in backlog grooming.

### Daily Pilot Cadence

1. 09:00 local: review new items from feature inbox and bug submissions.
2. 13:00 local: status update on open P0/P1/P2 items.
3. 18:00 local: closeout summary, owner handoff, and risk callouts.

### Required Triage Fields

-   Severity
-   Owner
-   Reproduction status
-   User impact
-   Target fix window
-   Verification evidence

### Escalation Rules

-   Any P0 or repeated P1 in the same flow pauses new tester invites.
-   Any cron-related issue with duplicate reminders triggers immediate dry-run validation before next live dispatch.
-   Any auth regression (register/login/reset) blocks cohort expansion until verified fixed.

## Part 4: Post-Cohort Telemetry and Cron Baselines

### Goal

Verify activation, retention, and cron pipelines are healthy after the first external tester cohort starts.

### When To Run

-   First run: 24 hours after onboarding first cohort.
-   Follow-up run: daily for first 7 days.

### Inputs Required

-   Access to app logs with telemetry events (`[telemetry] ...`).
-   Access to cron run responses from `/api/jobs/drift-scan` and `/api/jobs/nudges/dispatch`.
-   Founder inbox visibility for feature requests.

### Event Baseline Checklist

Confirm non-zero event volume for these events in the first cohort window.

-   `auth.registered`
-   `auth.login.succeeded`
-   `auth.email.verified`
-   `activation.task.created`
-   `activation.commitment.created`
-   `activation.proof.submitted`
-   `retention.tasks.viewed`
-   `retention.commitments.viewed`
-   `feature.requested`

### Cron Baseline Checklist

1. Drift scan
   -   Trigger dry-run via script (`npm run pilot:cron-check`) or direct route: `POST /api/jobs/drift-scan?dryRun=1&limit=200`
   -   Confirm response includes: `runId`, `durationMs`, `ok=true`
   -   If live run is performed, verify no reminder duplication spike.
2. Nudge dispatch
   -   Trigger dry-run via script (`npm run pilot:cron-check`) or direct route: `POST /api/jobs/nudges/dispatch?dryRun=1&limit=200`
   -   Confirm response includes: `runId`, `durationMs`, and bounded `sent/failed` counts.
   -   For live run, sample at least 3 reminders to verify expected channel and content.

### Acceptance Thresholds (Week 1)

-   Activation: at least 60% of newly registered pilot users create one task within 24 hours.
-   Commitment loop: at least 50% of activated users create one commitment within 48 hours.
-   Proof loop: at least 50% of commitments have proof before due.
-   Scheduling: at least 40% of calendar-connected users apply one suggested block in week 1.
-   Cron reliability: zero P0/P1 cron incidents and no sustained reminder duplication.

### Failure Triggers

Escalate immediately if any condition is true.

-   Missing telemetry for core activation events for >24 hours.
-   Repeated cron failures (`drift_scan.failed` or `nudge.dispatch.failed`) in consecutive runs.
-   Duplicate reminder reports from 2 or more testers in one day.
-   Any auth regression that prevents register/login/reset.

### Daily Reporting Template

-   Date window
-   Event counts by key funnel stage
-   Cron runs (`runId`, mode, duration, sent, failed)
-   New P0/P1 incidents
-   Go/no-go recommendation: proceed / hold / rollback cohort expansion
