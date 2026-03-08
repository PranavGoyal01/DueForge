import { CheckInHistoryPanel } from "@/components/CheckInHistoryPanel";
import { CheckInPanel } from "@/components/CheckInPanel";
import { MetricCard } from "@/components/dashboard/MetricCard";
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
				<header className='space-y-2'>
					<p className='text-xs uppercase tracking-widest text-muted-foreground'>CHECK-INS</p>
					<h1 className='text-3xl font-semibold tracking-tight'>Accountability Check-In Control</h1>
					<p className='text-sm text-muted-foreground'>Schedule the next two weeks, track cadence, and keep partner alignment visible.</p>
				</header>

				<section className='grid gap-3 sm:grid-cols-4'>
					<MetricCard label='Partner' value={relationship?.partnerUser.name ?? "No partner linked"} valueClassName='text-sm' />
					<MetricCard label='Upcoming (7d)' value={upcomingWeekCount} valueClassName='text-2xl' />
					<MetricCard label='Next Check-In' value={formatDate(nextCheckIn?.scheduledAt ?? null)} valueClassName='text-sm' />
					<MetricCard label='Unresolved Past (30d)' value={unresolvedPastCount} valueClassName='text-2xl text-amber-300' />
				</section>

				<CheckInPanel />

				<CheckInHistoryPanel
					initialItems={recentPastCheckIns.map((item) => ({
						id: item.id,
						scheduledAt: item.scheduledAt.toISOString(),
						mode: item.mode,
						agenda: item.agenda,
						outcome: item.outcome,
						nextCommitments: item.nextCommitments,
					}))}
				/>
			</div>
		</main>
	);
}
