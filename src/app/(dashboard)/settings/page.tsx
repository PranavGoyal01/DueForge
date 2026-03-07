import { OpsRunPanel } from "@/components/dashboard/OpsRunPanel";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

function formatDate(value: Date | null) {
	if (!value) {
		return "Not available";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
}

export default async function SettingsPage() {
	const user = await getSessionUser();
	if (!user) {
		redirect("/login");
	}

	const [connection, lastScheduledCheckIn, openCommitments] = await Promise.all([
		prisma.calendarConnection.findUnique({
			where: {
				userId_provider: {
					userId: user.id,
					provider: "google",
				},
			},
		}),
		prisma.checkIn.findFirst({
			where: {
				relationship: {
					userId: user.id,
				},
			},
			orderBy: {
				scheduledAt: "desc",
			},
		}),
		prisma.commitment.count({
			where: {
				committedById: user.id,
				status: "COMMITTED",
			},
		}),
	]);

	const envChecks = {
		authSecret: (process.env.AUTH_SECRET ?? "").length >= 24,
		databaseUrl: Boolean(process.env.DATABASE_URL),
		directUrl: Boolean(process.env.DIRECT_URL),
		smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_EMAIL),
		googleOauth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
		featureRequestRecipient: Boolean(process.env.FEATURE_REQUEST_RECIPIENT),
	};

	const userTestingReady = envChecks.authSecret && envChecks.databaseUrl && envChecks.smtp;

	return (
		<main className='min-h-screen bg-background px-6 py-8 text-foreground md:px-10'>
			<div className='mx-auto w-full max-w-6xl space-y-6'>
				<header>
					<p className='text-xs uppercase tracking-widest df-subtle'>SETTINGS</p>
					<h1 className='mt-2 text-3xl font-semibold tracking-tight'>System Diagnostics</h1>
					<p className='mt-2 text-sm df-subtle'>Use this page as your beta readiness checklist before user testing sessions.</p>
				</header>

				<section className='grid gap-3 sm:grid-cols-3'>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>User Testing Readiness</p>
						<p className={`mt-1 text-sm font-semibold ${userTestingReady ? "text-emerald-300" : "text-amber-300"}`}>{userTestingReady ? "Ready" : "Needs setup"}</p>
					</article>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>Google Calendar</p>
						<p className={`mt-1 text-sm font-semibold ${connection?.syncState === "connected" ? "text-emerald-300" : "text-amber-300"}`}>{connection?.syncState === "connected" ? "Connected" : "Not connected"}</p>
					</article>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>Open Commitments</p>
						<p className='mt-1 text-xl font-semibold text-white'>{openCommitments}</p>
					</article>
				</section>

				<section className='df-panel p-5'>
					<h2 className='text-sm font-semibold uppercase tracking-wide df-muted'>Account + Activity</h2>
					<div className='mt-3 grid gap-3 md:grid-cols-2'>
						<article className='df-card px-3 py-2'>
							<p className='text-xs uppercase df-subtle'>Email</p>
							<p className='mt-1 text-sm text-white'>{user.email}</p>
						</article>
						<article className='df-card px-3 py-2'>
							<p className='text-xs uppercase df-subtle'>Email Verified</p>
							<p className='mt-1 text-sm text-white'>{user.emailVerifiedAt ? "Yes" : "No"}</p>
						</article>
						<article className='df-card px-3 py-2'>
							<p className='text-xs uppercase df-subtle'>Timezone</p>
							<p className='mt-1 text-sm text-white'>{user.timezone}</p>
						</article>
						<article className='df-card px-3 py-2'>
							<p className='text-xs uppercase df-subtle'>Last Check-In Scheduled</p>
							<p className='mt-1 text-sm text-white'>{formatDate(lastScheduledCheckIn?.scheduledAt ?? null)}</p>
						</article>
					</div>
				</section>

				<section className='df-panel p-5'>
					<h2 className='text-sm font-semibold uppercase tracking-wide df-muted'>Environment Checklist</h2>
					<p className='mt-2 text-xs df-subtle'>Displays only readiness booleans, never secret values.</p>
					<div className='mt-3 grid gap-2 md:grid-cols-2'>
						<p className='df-card px-3 py-2 text-xs text-white'>AUTH_SECRET strong: {envChecks.authSecret ? "Yes" : "No"}</p>
						<p className='df-card px-3 py-2 text-xs text-white'>DATABASE_URL set: {envChecks.databaseUrl ? "Yes" : "No"}</p>
						<p className='df-card px-3 py-2 text-xs text-white'>DIRECT_URL set: {envChecks.directUrl ? "Yes" : "No"}</p>
						<p className='df-card px-3 py-2 text-xs text-white'>SMTP configured: {envChecks.smtp ? "Yes" : "No"}</p>
						<p className='df-card px-3 py-2 text-xs text-white'>Google OAuth configured: {envChecks.googleOauth ? "Yes" : "No"}</p>
						<p className='df-card px-3 py-2 text-xs text-white'>Feature request inbox set: {envChecks.featureRequestRecipient ? "Yes" : "No"}</p>
					</div>
				</section>

				<section className='df-panel p-5'>
					<h2 className='text-sm font-semibold uppercase tracking-wide df-muted'>Quick Actions</h2>
					<div className='mt-3 flex flex-wrap gap-2'>
						<Link href='/today' className='df-btn-secondary px-3 py-2 text-xs'>
							Go to Today
						</Link>
						<Link href='/schedule' className='df-btn-secondary px-3 py-2 text-xs'>
							Open Scheduler
						</Link>
						<Link href='/checkins' className='df-btn-secondary px-3 py-2 text-xs'>
							Open Check-Ins
						</Link>
					</div>
				</section>

				<OpsRunPanel />
			</div>
		</main>
	);
}
