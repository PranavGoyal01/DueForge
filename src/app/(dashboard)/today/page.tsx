import { CheckInPanel } from "@/components/CheckInPanel";
import { CommitmentFeed } from "@/components/CommitmentFeed";
import { GoogleCalendarConnectButton } from "@/components/GoogleCalendarConnectButton";
import { QuickCaptureForm } from "@/components/QuickCaptureForm";
import { SchedulePlanner } from "@/components/SchedulePlanner";
import { getSessionCookieName, getSessionUser } from "@/lib/auth";
import { ensureRelationshipForUser } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
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

	const [tasks, commitments, overdueCount, googleConnection] = await Promise.all([
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
	]);

	const committedTaskIds = new Set(commitments.map((item) => item.taskId));
	const serializedCommitments = serializeCommitments(commitments);
	const now = new Date();
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

	return (
		<main className='min-h-screen bg-background px-6 py-8 text-foreground md:px-10'>
			<div className='mx-auto w-full max-w-6xl'>
				<header className='mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
					<div>
						<p className='text-xs uppercase tracking-widest df-subtle'>DUEFORGE</p>
						<h1 className='mt-2 text-3xl font-semibold tracking-tight'>Execution Command Center</h1>
						<p className='mt-2 text-sm df-subtle'>Turn commitments into scheduled, visible follow-through.</p>
					</div>
					<div className='flex items-end gap-3'>
						<GoogleCalendarConnectButton isConnected={googleConnection?.syncState === "connected"} />
						<div className='grid grid-cols-3 gap-3'>
							<div className='df-card px-4 py-3'>
								<p className='text-xs uppercase df-subtle'>Open Tasks</p>
								<p className='text-2xl font-semibold'>{tasks.filter((task) => task.status !== "DONE").length}</p>
							</div>
							<div className='df-card px-4 py-3'>
								<p className='text-xs uppercase df-subtle'>Committed</p>
								<p className='text-2xl font-semibold'>{commitments.length}</p>
							</div>
							<div className='df-card px-4 py-3'>
								<p className='text-xs uppercase df-subtle'>Overdue</p>
								<p className='text-2xl font-semibold text-amber-300'>{overdueCount}</p>
							</div>
						</div>
						<form action={signOut}>
							<button type='submit' className='df-btn-secondary px-3 py-2 text-xs'>
								Logout
							</button>
						</form>
					</div>
				</header>

				<section className='mb-6 rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4'>
					<div className='flex items-center justify-between'>
						<h2 className='text-xs font-semibold uppercase tracking-wide text-amber-200'>At-Risk Commitments</h2>
						<p className='text-xs text-amber-300/80'>Due soon or missing proof</p>
					</div>
					<div className='mt-3 space-y-2'>
						{atRiskCommitments.length === 0 ? (
							<p className='text-xs text-amber-200/80'>No commitments currently at risk.</p>
						) : (
							atRiskCommitments.slice(0, 5).map((item) => (
								<article key={item.id} className='df-card px-3 py-2'>
									<p className='text-sm text-white'>{item.task.title}</p>
									<p className='text-xs df-subtle'>
										Due {formatDate(item.dueAt)} • Proofs: {item.proofs.length}
									</p>
								</article>
							))
						)}
					</div>
				</section>

				<div className='grid gap-6 lg:grid-cols-2'>
					<QuickCaptureForm />
					<CheckInPanel />
					<CommitmentFeed initialCommitments={serializedCommitments} />
				</div>

				<section className='df-panel mt-6 p-5'>
					<div className='flex items-center justify-between'>
						<h2 className='text-sm font-semibold uppercase tracking-wide df-muted'>Tasks</h2>
						<p className='text-xs df-subtle'>Mark a task as commitment-visible to activate accountability.</p>
					</div>
					<div className='mt-4 grid gap-3 md:grid-cols-2'>
						{tasks.length === 0 ? (
							<p className='text-sm df-subtle'>No tasks yet. Use quick capture to add your first commitment.</p>
						) : (
							tasks.map((task) => (
								<article key={task.id} className='df-card p-4'>
									<div className='flex items-start justify-between gap-3'>
										<div>
											<h3 className='text-sm font-medium text-white'>{task.title}</h3>
											<p className='mt-1 text-xs df-subtle'>
												Due {formatDate(task.dueAt)} • Risk {task.riskScore}%
											</p>
											<p className='mt-1 text-xs uppercase df-subtle'>Status: {task.status.replace("_", " ")}</p>
										</div>
										<span className='rounded-full border border-[var(--border)] px-2 py-1 text-xs df-muted'>P{task.priority}</span>
									</div>
									<div className='mt-3 flex items-center gap-2'>
										{task.tags.map((taskTag) => (
											<span key={taskTag.tagId} className='rounded-md bg-[var(--surface)] px-2 py-1 text-[11px] df-muted'>
												#{taskTag.tag.name}
											</span>
										))}
									</div>
									<form className='mt-4' action={commitToTask.bind(null, user.id, task.id)}>
										<button type='submit' disabled={committedTaskIds.has(task.id)} className='df-btn-primary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50'>
											{committedTaskIds.has(task.id) ? "Committed" : "Commit Task"}
										</button>
									</form>
								</article>
							))
						)}
					</div>
				</section>

				<SchedulePlanner tasks={schedulableTasks} />
			</div>
		</main>
	);
}
