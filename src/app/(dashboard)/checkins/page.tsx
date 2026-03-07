import { CheckInPanel } from "@/components/CheckInPanel";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function formatDate(value: Date | null) {
	if (!value) {
		return "No scheduled time";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
}

export default async function CheckInsPage() {
	const user = await getSessionUser();
	if (!user) {
		redirect("/login");
	}

	const now = new Date();
	const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	const [relationship, nextCheckIn, upcomingWeekCount, unresolvedPastCount, recentPastCheckIns] = await Promise.all([
		prisma.accountabilityRelationship.findFirst({
			where: { userId: user.id, active: true },
			include: { partnerUser: true },
			orderBy: { createdAt: "asc" },
		}),
		prisma.checkIn.findFirst({
			where: {
				relationship: {
					userId: user.id,
				},
				scheduledAt: { gte: now },
			},
			orderBy: {
				scheduledAt: "asc",
			},
		}),
		prisma.checkIn.count({
			where: {
				relationship: {
					userId: user.id,
				},
				scheduledAt: {
					gte: now,
					lte: sevenDays,
				},
			},
		}),
		prisma.checkIn.count({
			where: {
				relationship: {
					userId: user.id,
				},
				scheduledAt: {
					lt: now,
					gte: thirtyDaysAgo,
				},
				OR: [{ outcome: null }, { outcome: "" }],
			},
		}),
		prisma.checkIn.findMany({
			where: {
				relationship: {
					userId: user.id,
				},
				scheduledAt: {
					lt: now,
				},
			},
			orderBy: {
				scheduledAt: "desc",
			},
			take: 20,
		}),
	]);

	return (
		<main className='min-h-screen bg-background px-6 py-8 text-foreground md:px-10'>
			<div className='mx-auto w-full max-w-6xl space-y-6'>
				<header>
					<p className='text-xs uppercase tracking-widest df-subtle'>CHECK-INS</p>
					<h1 className='mt-2 text-3xl font-semibold tracking-tight'>Accountability Check-In Control</h1>
					<p className='mt-2 text-sm df-subtle'>Schedule the next two weeks, track cadence, and keep partner alignment visible.</p>
				</header>

				<section className='grid gap-3 sm:grid-cols-4'>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>Partner</p>
						<p className='mt-1 text-sm text-white'>{relationship?.partnerUser.name ?? "No partner linked"}</p>
					</article>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>Upcoming (7d)</p>
						<p className='mt-1 text-xl font-semibold text-white'>{upcomingWeekCount}</p>
					</article>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>Next Check-In</p>
						<p className='mt-1 text-sm text-white'>{formatDate(nextCheckIn?.scheduledAt ?? null)}</p>
					</article>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>Unresolved Past (30d)</p>
						<p className='mt-1 text-xl font-semibold text-amber-300'>{unresolvedPastCount}</p>
					</article>
				</section>

				<CheckInPanel />

				<section className='df-panel p-5'>
					<div className='flex items-center justify-between'>
						<h2 className='text-sm font-semibold uppercase tracking-wide df-muted'>Past Check-In History</h2>
						<p className='text-xs df-subtle'>Latest 20 sessions. Missing outcomes are follow-through debt.</p>
					</div>

					<div className='mt-4 space-y-2'>
						{recentPastCheckIns.length === 0 ? (
							<p className='text-xs df-subtle'>No past check-ins yet. Your history will appear after the first completed session.</p>
						) : (
							recentPastCheckIns.map((item) => {
								const hasOutcome = Boolean(item.outcome && item.outcome.trim().length > 0);
								return (
									<article key={item.id} className='df-card px-3 py-2'>
										<div className='flex items-start justify-between gap-3'>
											<div>
												<p className='text-sm text-white'>{formatDate(item.scheduledAt)}</p>
												<p className='mt-1 text-xs df-subtle'>{item.mode.replace("_", " ")}</p>
												{item.agenda ? <p className='mt-1 text-xs df-subtle'>Agenda: {item.agenda}</p> : null}
											</div>
											<span className={`rounded-full border px-2 py-0.5 text-[11px] ${hasOutcome ? "border-emerald-600/50 text-emerald-300" : "border-amber-600/50 text-amber-300"}`}>{hasOutcome ? "Outcome Logged" : "No Outcome Logged"}</span>
										</div>
										{hasOutcome ? <p className='mt-2 text-xs text-white/85'>Outcome: {item.outcome}</p> : <p className='mt-2 text-xs text-amber-200/90'>No recorded outcome. This check-in did not close the loop.</p>}
									</article>
								);
							})
						)}
					</div>
				</section>
			</div>
		</main>
	);
}
