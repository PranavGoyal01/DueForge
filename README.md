# DueForge

Execution-first accountability platform focused on follow-through, commitments, proof of progress, and check-ins.

## Brand

- Wordmark: `DUEFORGE` (uppercase, clean sans, slightly condensed)
- Palette: charcoal `#111111`, steel gray `#2A2F36`, electric amber `#F5A524`, white `#FFFFFF`
- Visual direction: minimalist, geometric, high-contrast, no gradients

## Stack

- Next.js App Router + TypeScript + Tailwind
- Prisma + Supabase Postgres
- Local auth (`bcryptjs` + JWT session cookie)
- Google Calendar OAuth (connect + callback + token persistence)

## Local setup

1. Install dependencies:

```bash
npm install
```

1. Configure environment in `.env`:

```dotenv
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
AUTH_SECRET="replace-with-long-random-secret"
APP_BASE_URL="http://localhost:3000"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM_EMAIL="no-reply@dueforge.local"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/google/callback"
DUEFORGE_DEDICATED_CALENDAR_NAME="DueForge"
```

1. Generate Prisma client and sync DB:

```bash
npm run db:generate
npm run db:push
```

Notes for Supabase poolers:

- `DATABASE_URL` should use transaction pooler (`:6543`) for app/runtime traffic.
- `DIRECT_URL` should use session pooler (`:5432`) for Prisma schema commands (`db:push`, migrations).

For team or production migrations, prefer:

```bash
npm run db:migrate
```

If you want a fully clean Supabase schema before applying Prisma models:

1. Run SQL in Supabase SQL Editor from `prisma/reset-public-schema.sql`.
2. Apply schema from Prisma:

```bash
npm run db:push
```

To inspect the exact SQL Prisma would generate from an empty database:

```bash
npm run db:bootstrap-sql
```

1. Run app:

```bash
npm run dev
```

## Auth flow

- Visit `/login` to register or sign in.
- Session is stored in an HTTP-only cookie.
- Dashboard redirects to `/login` when unauthenticated.
- Registration sends an account verification email (`/api/auth/verify-email`).
- Forgot password starts at `/forgot-password`; reset completes at `/reset-password`.

### Email delivery

- Configure SMTP variables in `.env` to send verification and reset emails.
- If SMTP is not configured, DueForge safely skips delivery and logs a warning in the server console.

## Google Calendar OAuth setup

Create OAuth client credentials in Google Cloud Console:

- Application type: Web application
- Authorized redirect URI:
    - `http://localhost:3000/api/integrations/google/callback`

Then populate `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

### Trigger connection

- Open dashboard (`/`)
- Click **Connect Google Calendar**
- Complete Google consent screen
- Callback stores tokens in `CalendarConnection.tokensRef`, sets `syncState=connected`, and auto-creates a dedicated calendar

### Dedicated calendar behavior

- DueForge automatically creates a dedicated calendar (default name: `DueForge`) after OAuth callback.
- Schedule apply writes events only to that dedicated calendar, never into your primary calendar.
- You can rename the created calendar in Google Calendar UI later if needed.

### In-dashboard scheduling flow

- Select open tasks in the **Scheduler** panel.
- Choose which connected calendars should block scheduling (primary/shared/DueForge) and set their priority order.
- Click **Suggest Schedule** to generate time blocks.
- Click **Apply to Calendar** to create events in dedicated DueForge calendar.

### In-dashboard check-ins flow

- Use the **Check-ins** panel to schedule a check-in (date/time + mode + optional agenda).
- Upcoming check-ins for the next two weeks are listed in the same panel.

### In-dashboard proof flow

- In **Commitment Feed**, submit proof as text or link for each commitment.
- Optionally check **Mark completed** to submit proof and complete the commitment/task in one step.
- Filter commitments by **Today**, **Week**, or **At Risk** using scope controls in the feed header.

### At-risk visibility

- The dashboard includes an **At-Risk Commitments** strip showing committed items that are due within 24 hours or still missing proof.

### Task duplicate protection

- Creating a task with the same title as an existing active task is blocked to avoid duplicate commitments.

## API docs

- OpenAPI JSON: `/api/openapi.json`
- Health check: `/api/health`

## Validation

```bash
npm run db:generate
npm run db:push
npm run db:migrate:deploy
npm run lint
npm run build
```
