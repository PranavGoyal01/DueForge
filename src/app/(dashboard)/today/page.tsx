import { CheckInPanel } from "@/components/CheckInPanel";
import { CommitmentFeed } from "@/components/CommitmentFeed";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { GoogleCalendarConnectButton } from "@/components/GoogleCalendarConnectButton";
import { QuickCaptureForm } from "@/components/QuickCaptureForm";
import { SchedulePlanner } from "@/components/SchedulePlanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionCookieName, getSessionUser } from "@/lib/auth";
import { ensureRelationshipForUser } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function formatDate(value: Date | null) {
	if (!value) {
		return "No deadline";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
}

function formatPercent(value: number) {
	return `${Math.round(value)}%`;
}

function startOfUtcDay(value: Date) {
	return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function getStreakStats(eventTimestamps: Date[]) {
	if (eventTimestamps.length === 0) {
		return { currentStreak: 0, bestStreak: 0 };
	}

	const dayKeys = new Set(eventTimestamps.map((value) => startOfUtcDay(value).toISOString()));
	const sortedDays = Array.from(dayKeys)
		.map((day) => new Date(day))
		.sort((a, b) => a.getTime() - b.getTime());

	let bestStreak = 1;
	let rolling = 1;
	for (let index = 1; index < sortedDays.length; index += 1) {
		const deltaDays = Math.round((sortedDays[index].getTime() - sortedDays[index - 1].getTime()) / (1000 * 60 * 60 * 24));
		if (deltaDays === 1) {
			rolling += 1;
		} else {
			rolling = 1;
		}
		bestStreak = Math.max(bestStreak, rolling);
	}

	let currentStreak = 0;
	let cursor = startOfUtcDay(new Date());
	while (dayKeys.has(cursor.toISOString())) {
		currentStreak += 1;
		cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
	}

	return { currentStreak, bestStreak };
}

function serializeCommitments(
	commitments: Array<{
		id: string;
		dueAt: Date | null;
		status: string;
		task: { title: string };
		proofs: { id: string }[];
	}>,
) {
	return commitments.map((item) => ({
		id: item.id,
		dueAt: item.dueAt ? item.dueAt.toISOString() : null,
		status: item.status,
		task: { title: item.task.title },
		proofs: item.proofs.map((proof) => ({ id: proof.id })),
	}));
}

async function commitToTask(userId: string, taskId: string) {
	"use server";

	const task = await prisma.task.findFirst({
		where: {
			id: taskId,
			ownerId: userId,
		},
	});

	if (!task) {
		return;
	}

	const relationship = await ensureRelationshipForUser(userId);

	await prisma.commitment.create({
		data: {
			taskId: task.id,
			committedById: userId,
			committedToId: relationship?.partnerUserId,
			dueAt: task.dueAt,
		},
	});

	await prisma.activityEvent.create({
		data: {
			actorId: userId,
			entityType: "commitment",
			entityId: task.id,
			eventType: "commitment.created",
			payloadJson: { taskId },
		},
	});

	revalidatePath("/today");
	revalidatePath("/commitments");
}

async function deleteTask(userId: string, taskId: string) {
	"use server";

	const existing = await prisma.task.findFirst({
		where: {
			id: taskId,
			ownerId: userId,
		},
		select: { id: true, title: true },
	});

	if (!existing) {
		return;
	}

	await prisma.task.delete({ where: { id: existing.id } });

	await prisma.activityEvent.create({
		data: {
			actorId: userId,
			entityType: "task",
			entityId: existing.id,
			eventType: "task.deleted",
			payloadJson: { title: existing.title },
		},
	});

	revalidatePath("/today");
	revalidatePath("/commitments");
}

async function signOut() {
	"use server";

	const cookieStore = await cookies();
	cookieStore.delete(getSessionCookieName());
	redirect("/login");
}

export default async function TodayPage() {
	const user = await getSessionUser();
	if (!user) {
		redirect("/login");
	}

	const now = new Date();
	const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

	const [tasks, commitments, overdueCount, googleConnection, commitmentsWindowCount, commitmentsWithProofWindowCount, completedWithDueWindowItems, proofSubmittedEvents] = await Promise.all([
		prisma.task.findMany({
			where: { ownerId: user.id },
			include: { commitments: true, tags: { include: { tag: true } } },
			orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
			take: 12,
		}),
		prisma.commitment.findMany({
			where: { committedById: user.id },
			include: { task: true, proofs: true, committedTo: true },
			orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
			take: 8,
		}),
		prisma.task.count({
			where: {
				ownerId: user.id,
				dueAt: { lt: new Date() },
				status: { not: "DONE" },
			},
		}),
		prisma.calendarConnection.findUnique({
			where: {
				userId_provider: {
					userId: user.id,
					provider: "google",
				},
			},
		}),
		prisma.commitment.count({
			where: {
				committedById: user.id,
				commitAt: { gte: ninetyDaysAgo },
			},
		}),
		prisma.commitment.count({
			where: {
				committedById: user.id,
				commitAt: { gte: ninetyDaysAgo },
				proofs: { some: {} },
			},
		}),
		prisma.commitment.findMany({
			where: {
				committedById: user.id,
				commitAt: { gte: ninetyDaysAgo },
				status: "COMPLETED",
				dueAt: { not: null },
			},
			select: {
				updatedAt: true,
				dueAt: true,
			},
		}),
		prisma.activityEvent.findMany({
			where: {
				actorId: user.id,
				eventType: "proof.submitted",
				createdAt: {
					gte: ninetyDaysAgo,
				},
			},
			select: {
				createdAt: true,
			},
			orderBy: {
				createdAt: "asc",
			},
		}),
	]);

	const committedTaskIds = new Set(commitments.map((item) => item.taskId));
	const serializedCommitments = serializeCommitments(commitments);
	const oneDayAhead = new Date(now.getTime() + 1000 * 60 * 60 * 24);
	const atRiskCommitments = commitments.filter((item) => {
		if (item.status !== "COMMITTED") {
			return false;
		}

		const dueSoon = item.dueAt ? item.dueAt <= oneDayAhead : false;
		const noProofYet = item.proofs.length === 0;
		return dueSoon || noProofYet;
	});
	const schedulableTasks = tasks
		.filter((task) => task.status !== "DONE")
		.map((task) => ({
			id: task.id,
			title: task.title,
			dueAt: task.dueAt ? task.dueAt.toISOString() : null,
			estimatedMinutes: task.estimatedMinutes,
		}));

	const proofRate = commitmentsWindowCount === 0 ? 0 : (commitmentsWithProofWindowCount / commitmentsWindowCount) * 100;
	const completedWithDueWindowCount = completedWithDueWindowItems.length;
	const completedOnTimeWindowCount = completedWithDueWindowItems.filter((item) => item.dueAt && item.updatedAt <= item.dueAt).length;
	const onTimeRate = completedWithDueWindowCount === 0 ? 0 : (completedOnTimeWindowCount / completedWithDueWindowCount) * 100;
	const streakStats = getStreakStats(proofSubmittedEvents.map((event) => event.createdAt));

	return (
		<main className='df-app-page'>
			<div className='mx-auto w-full max-w-6xl'>
				<header className='mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
					<div>
						<p className='df-page-kicker'>Command Surface</p>
						<h1 className='df-page-title'>Execution Command Center</h1>
						<p className='df-page-lead'>Turn commitments into scheduled, visible follow-through with fewer dropped loops.</p>
					</div>
					<div className='flex flex-wrap items-end gap-3'>
						<GoogleCalendarConnectButton isConnected={googleConnection?.syncState === "connected"} />
						<div className='grid grid-cols-3 gap-3'>
							<MetricCard label='Open Tasks' value={tasks.filter((task) => task.status !== "DONE").length} valueClassName='text-2xl' />
							<MetricCard label='Committed' value={commitments.length} valueClassName='text-2xl' />
							<MetricCard label='Overdue' value={overdueCount} valueClassName='text-2xl text-amber-300' />
						</div>
						<form action={signOut}>
							<Button type='submit' variant='outline' size='sm'>
								Logout
							</Button>
						</form>
					</div>
				</header>

				<Card className='mb-6 border-amber-700/30 bg-amber-950/20 py-4'>
					<CardHeader>
						<CardTitle className='text-xs font-semibold uppercase tracking-wide text-amber-200'>At-Risk Commitments</CardTitle>
						<CardDescription className='text-xs text-amber-300/80'>Due soon or missing proof</CardDescription>
					</CardHeader>
					<CardContent className='space-y-2'>
						{atRiskCommitments.length === 0 ? (
							<p className='text-xs text-amber-200/80'>No commitments currently at risk.</p>
						) : (
							atRiskCommitments.slice(0, 5).map((item) => (
								<Card key={item.id} size='sm' className='border bg-card/70 py-3'>
									<CardContent>
										<p className='text-sm'>{item.task.title}</p>
										<p className='text-xs text-muted-foreground'>
											Due {formatDate(item.dueAt)} • Proofs: {item.proofs.length}
										</p>
									</CardContent>
								</Card>
							))
						)}
					</CardContent>
				</Card>

				<Card className='mb-6 py-5'>
					<CardHeader>
						<CardTitle className='text-sm font-semibold uppercase tracking-wide'>Accountability Metrics (90d)</CardTitle>
						<CardDescription>Founder-view metrics for execution reliability and follow-through momentum.</CardDescription>
					</CardHeader>
					<CardContent className='grid gap-3 sm:grid-cols-4'>
						<MetricCard label='On-Time Completion' value={formatPercent(onTimeRate)} valueClassName='text-2xl' />
						<MetricCard label='Proof Rate' value={formatPercent(proofRate)} valueClassName='text-2xl' />
						<MetricCard label='Current Proof Streak' value={`${streakStats.currentStreak}d`} valueClassName='text-2xl' />
						<MetricCard label='Best Proof Streak' value={`${streakStats.bestStreak}d`} valueClassName='text-2xl' />
					</CardContent>
				</Card>

				<div className='grid gap-6 lg:grid-cols-2'>
					<QuickCaptureForm />
					<CheckInPanel />
					<CommitmentFeed initialCommitments={serializedCommitments} />
				</div>

				<Card className='mt-6 py-5'>
					<CardHeader>
						<CardTitle className='text-sm font-semibold uppercase tracking-wide'>Tasks</CardTitle>
						<CardDescription>Mark a task as commitment-visible to activate accountability.</CardDescription>
					</CardHeader>
					<CardContent className='grid gap-3 md:grid-cols-2'>
						{tasks.length === 0 ? (
							<p className='text-sm text-muted-foreground'>No tasks yet. Use quick capture to add your first commitment.</p>
						) : (
							tasks.map((task) => (
								<Card key={task.id} className='py-4'>
									<CardContent>
										<div className='flex items-start justify-between gap-3'>
											<div>
												<h3 className='text-sm font-medium'>{task.title}</h3>
												<p className='mt-1 text-xs text-muted-foreground'>
													Due {formatDate(task.dueAt)} • Risk {task.riskScore}%
												</p>
												<p className='mt-1 text-xs uppercase text-muted-foreground'>Status: {task.status.replace("_", " ")}</p>
											</div>
											<Badge variant='outline'>P{task.priority}</Badge>
										</div>
										<div className='mt-3 flex items-center gap-2'>
											{task.tags.map((taskTag) => (
												<Badge key={taskTag.tagId} variant='secondary' className='text-[11px]'>
													#{taskTag.tag.name}
												</Badge>
											))}
										</div>
										<div className='mt-4 flex items-center gap-2'>
											<form action={commitToTask.bind(null, user.id, task.id)}>
												<Button type='submit' size='sm' disabled={committedTaskIds.has(task.id)}>
													{committedTaskIds.has(task.id) ? "Committed" : "Commit Task"}
												</Button>
											</form>
											<form action={deleteTask.bind(null, user.id, task.id)}>
												<Button type='submit' size='sm' variant='destructive'>
													Delete Task
												</Button>
											</form>
										</div>
									</CardContent>
								</Card>
							))
						)}
					</CardContent>
				</Card>

				<SchedulePlanner tasks={schedulableTasks} />
			</div>
		</main>
	);
}
