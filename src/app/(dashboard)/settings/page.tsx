import { MetricCard } from "@/components/dashboard/MetricCard";
import { OpsRunPanel } from "@/components/dashboard/OpsRunPanel";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

function formatDate(value: Date | null) {
	if (!value) {
		return "Not available";
	}

	return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(value);
}

export default async function SettingsPage() {
	const user = await getSessionUser();
	if (!user) {
		redirect("/login");
	}

	const [connection, lastScheduledCheckIn, openCommitments] = await Promise.all([prisma.calendarConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: "google" } } }), prisma.checkIn.findFirst({ where: { relationship: { userId: user.id } }, orderBy: { scheduledAt: "desc" } }), prisma.commitment.count({ where: { committedById: user.id, status: "COMMITTED" } })]);

	const envChecks = { authSecret: (process.env.AUTH_SECRET ?? "").length >= 24, databaseUrl: Boolean(process.env.DATABASE_URL), directUrl: Boolean(process.env.DIRECT_URL), cronSecret: (process.env.CRON_SECRET ?? "").length >= 16, smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_EMAIL), googleOauth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI), featureRequestRecipient: Boolean(process.env.FEATURE_REQUEST_RECIPIENT) };

	const userTestingReady = envChecks.authSecret && envChecks.databaseUrl && envChecks.smtp;

	return (
		<main className='df-app-page'>
			<div className='mx-auto w-full max-w-6xl space-y-6'>
				<header className='space-y-2'>
					<p className='df-page-kicker'>Settings</p>
					<h1 className='df-page-title'>System Diagnostics</h1>
					<p className='df-page-lead'>Use this page as your beta readiness checklist before user testing sessions.</p>
				</header>

				<section className='grid gap-3 sm:grid-cols-3'>
					<MetricCard label='User Testing Readiness' value={userTestingReady ? "Ready" : "Needs setup"} valueClassName={`text-sm ${userTestingReady ? "text-emerald-300" : "text-amber-300"}`} />
					<MetricCard label='Google Calendar' value={connection?.syncState === "connected" ? "Connected" : "Not connected"} valueClassName={`text-sm ${connection?.syncState === "connected" ? "text-emerald-300" : "text-amber-300"}`} />
					<MetricCard label='Open Commitments' value={openCommitments} valueClassName='text-2xl' />
				</section>

				<Card className='py-5'>
					<CardContent>
						<SectionHeader title='Account + Activity' />
						<div className='mt-3 grid gap-3 md:grid-cols-2'>
							<Card className='py-3'>
								<CardContent>
									<p className='text-xs uppercase text-muted-foreground'>Email</p>
									<p className='mt-1 text-sm'>{user.email}</p>
								</CardContent>
							</Card>
							<Card className='py-3'>
								<CardContent>
									<p className='text-xs uppercase text-muted-foreground'>Email Verified</p>
									<p className='mt-1 text-sm'>{user.emailVerifiedAt ? "Yes" : "No"}</p>
								</CardContent>
							</Card>
							<Card className='py-3'>
								<CardContent>
									<p className='text-xs uppercase text-muted-foreground'>Timezone</p>
									<p className='mt-1 text-sm'>{user.timezone}</p>
								</CardContent>
							</Card>
							<Card className='py-3'>
								<CardContent>
									<p className='text-xs uppercase text-muted-foreground'>Last Check-In Scheduled</p>
									<p className='mt-1 text-sm'>{formatDate(lastScheduledCheckIn?.scheduledAt ?? null)}</p>
								</CardContent>
							</Card>
						</div>
					</CardContent>
				</Card>

				<Card className='py-5'>
					<CardContent>
						<SectionHeader title='Environment Checklist' description='Displays only readiness booleans, never secret values.' />
						<div className='mt-3 grid gap-2 md:grid-cols-2'>
							<div className='rounded-lg border border-border bg-card/60 px-3 py-2 text-xs'>
								AUTH_SECRET strong: <Badge variant={envChecks.authSecret ? "secondary" : "outline"}>{envChecks.authSecret ? "Yes" : "No"}</Badge>
							</div>
							<div className='rounded-lg border border-border bg-card/60 px-3 py-2 text-xs'>
								DATABASE_URL set: <Badge variant={envChecks.databaseUrl ? "secondary" : "outline"}>{envChecks.databaseUrl ? "Yes" : "No"}</Badge>
							</div>
							<div className='rounded-lg border border-border bg-card/60 px-3 py-2 text-xs'>
								DIRECT_URL set: <Badge variant={envChecks.directUrl ? "secondary" : "outline"}>{envChecks.directUrl ? "Yes" : "No"}</Badge>
							</div>
							<div className='rounded-lg border border-border bg-card/60 px-3 py-2 text-xs'>
								CRON_SECRET configured: <Badge variant={envChecks.cronSecret ? "secondary" : "outline"}>{envChecks.cronSecret ? "Yes" : "No"}</Badge>
							</div>
							<div className='rounded-lg border border-border bg-card/60 px-3 py-2 text-xs'>
								SMTP configured: <Badge variant={envChecks.smtp ? "secondary" : "outline"}>{envChecks.smtp ? "Yes" : "No"}</Badge>
							</div>
							<div className='rounded-lg border border-border bg-card/60 px-3 py-2 text-xs'>
								Google OAuth configured: <Badge variant={envChecks.googleOauth ? "secondary" : "outline"}>{envChecks.googleOauth ? "Yes" : "No"}</Badge>
							</div>
							<div className='rounded-lg border border-border bg-card/60 px-3 py-2 text-xs'>
								Feature request inbox set: <Badge variant={envChecks.featureRequestRecipient ? "secondary" : "outline"}>{envChecks.featureRequestRecipient ? "Yes" : "No"}</Badge>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className='py-5'>
					<CardContent>
						<SectionHeader title='Quick Actions' />
						<div className='mt-3 flex flex-wrap gap-2'>
							<Link href='/today' className='inline-flex h-7 items-center rounded-md border border-input bg-background px-3 text-xs hover:bg-muted'>
								Go to Today
							</Link>
							<Link href='/schedule' className='inline-flex h-7 items-center rounded-md border border-input bg-background px-3 text-xs hover:bg-muted'>
								Open Scheduler
							</Link>
							<Link href='/checkins' className='inline-flex h-7 items-center rounded-md border border-input bg-background px-3 text-xs hover:bg-muted'>
								Open Check-Ins
							</Link>
							<Link href='/feature-requests' className='inline-flex h-7 items-center rounded-md border border-input bg-background px-3 text-xs hover:bg-muted'>
								Feature Inbox
							</Link>
						</div>
					</CardContent>
				</Card>

				<OpsRunPanel />
			</div>
		</main>
	);
}
