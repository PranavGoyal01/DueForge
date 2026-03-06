# Vercel + Supabase Setup Guide

## Required Software

- Node.js 20 LTS
- npm 10+
- GitHub account
- Vercel account
- Supabase account
- Optional: Vercel CLI (`npm i -g vercel`)
- Optional: Supabase CLI (`npm i -g supabase`)

## 1. Create Supabase Project

1. In Supabase, create a new project in your preferred region.
1. In Supabase, open `Project Settings -> Database -> Connection pooling`.
1. Copy the pooler connection string (port `6543`).
1. Replace placeholders in `.env`:

```dotenv
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
```

Use `DATABASE_URL` for app/runtime and `DIRECT_URL` for Prisma schema operations.

1. Run schema sync locally:

```bash
npm run db:generate
npm run db:push
```

Use this when you need a totally clean schema:

1. In Supabase SQL Editor, run `prisma/reset-public-schema.sql`.
1. Re-apply schema from Prisma with `npm run db:push`.
1. Optional: inspect SQL first with `npm run db:bootstrap-sql`.

## 2. Configure Auth Secret

Generate a strong secret (32+ chars) and set:

```dotenv
AUTH_SECRET="<long-random-secret>"
```

## 3. Configure Brevo SMTP

Set these values from Brevo SMTP settings:

```dotenv
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="<brevo-user>"
SMTP_PASS="<brevo-password>"
SMTP_FROM_EMAIL="<verified-sender@yourdomain.com>"
```

## 4. Configure Google OAuth

In Google Cloud Console:

1. Create OAuth client (Web application).
1. Add redirect URIs:

- Local: `http://localhost:3000/api/integrations/google/callback`
- Prod: `https://<your-domain>/api/integrations/google/callback`

1. Set env vars:

```dotenv
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/google/callback"
```

For production, update `GOOGLE_REDIRECT_URI` to your domain callback URL.

## 5. Deploy to Vercel

1. Import repository into Vercel.
1. Set framework preset to Next.js.
1. Add all env vars from `.env` in Vercel Project Settings.
1. Configure production values:

```dotenv
APP_BASE_URL="https://<your-domain>"
GOOGLE_REDIRECT_URI="https://<your-domain>/api/integrations/google/callback"
```

1. Deploy.

## 6. Post-Deploy Checks

- Open `/api/health` and verify success.
- Register a test user and verify email delivery.
- Connect Google Calendar and run suggest/apply schedule once.
- Create a task, commit it, and submit proof.

## 7. Recommended Next Hardening

- Add Vercel cron for drift scan and reminder jobs.
- Add Sentry (or equivalent) for production exception monitoring.
- Add `npm run db:migrate:deploy` to deployment workflow when you start migrations.
