# DueForge Preview Environment Checklist

Last updated: 2026-04-10

## Goal

Keep Preview and Production isolated so testing is safe and predictable.

## Required Environment Split

Set different values for Preview and Production.

-   DATABASE_URL
-   DIRECT_URL
-   AUTH_SECRET
-   CRON_SECRET
-   APP_BASE_URL
-   GOOGLE_REDIRECT_URI
-   GOOGLE_CLIENT_ID
-   GOOGLE_CLIENT_SECRET
-   SMTP_USER
-   SMTP_PASS
-   FEATURE_REQUEST_RECIPIENT

## Recommended Differences

-   DUEFORGE_DEDICATED_CALENDAR_NAME
    -   Suggested Preview value: DueForge Preview

## Suggested Environment Values

-   Production APP_BASE_URL: `https://dueforge.com`
-   Preview APP_BASE_URL: your Vercel preview URL
-   Production GOOGLE_REDIRECT_URI: `https://dueforge.com/api/integrations/google/callback`
-   Preview GOOGLE_REDIRECT_URI: `https://preview-host/api/integrations/google/callback`

## Rotation Rules

Rotate immediately if any secret was exposed via:

-   git commit or push
-   screenshots or shared logs
-   pasted terminal output
-   untrusted/shared machine access

No emergency rotation is required only because Vercel created .env.local on your local machine, as long as the file stayed private and untracked.

## Validation Steps

1. Confirm Preview env vars are set in Vercel Project Settings for Preview environment.
2. Confirm Production env vars are set separately for Production environment.
3. Run preview smoke checks:
    -   /api/health returns ok
    -   unauthenticated /today redirects to /login
    -   /api/jobs/drift-scan unauthorized access returns 401
4. Run cron dry-run from preview with preview secrets.
5. Verify emails and feature requests route to preview-safe inboxes.

## Optional Hardening

-   Use a separate Supabase project for Preview.
-   Use a separate Google OAuth app for Preview.
-   Use separate SMTP credentials for Preview.
-   Rotate AUTH_SECRET and CRON_SECRET quarterly.
