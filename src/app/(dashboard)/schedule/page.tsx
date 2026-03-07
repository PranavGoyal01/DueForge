import { SchedulePlanner } from "@/components/SchedulePlanner";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function formatDate(value: Date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
}

export default async function SchedulePage() {
	const user = await getSessionUser();
	if (!user) {
		redirect("/login");
	}

	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const [tasks, recentLinks, appliedEventsLastWeek, googleConnection] = await Promise.all([
		prisma.task.findMany({
			where: { ownerId: user.id, status: { not: "DONE" } },
			orderBy: [{ priority: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
			take: 16,
			select: {
				id: true,
				title: true,
				dueAt: true,
				estimatedMinutes: true,
			},
		}),
		prisma.calendarEventLink.findMany({
			where: {
				task: {
					ownerId: user.id,
				},
			},
			include: {
				task: {
					select: {
						title: true,
					},
				},
			},
			orderBy: {
				startAt: "desc",
			},
			take: 8,
		}),
		prisma.activityEvent.count({
			where: {
				actorId: user.id,
				eventType: "schedule.applied",
				createdAt: {
					gte: sevenDaysAgo,
				},
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

	const schedulableTasks = tasks.map((task) => ({
		id: task.id,
		title: task.title,
		dueAt: task.dueAt ? task.dueAt.toISOString() : null,
		estimatedMinutes: task.estimatedMinutes,
	}));

	return (
		<main className='min-h-screen bg-background px-6 py-8 text-foreground md:px-10'>
			<div className='mx-auto w-full max-w-6xl space-y-6'>
				<header>
					<p className='text-xs uppercase tracking-widest df-subtle'>SCHEDULE</p>
					<h1 className='mt-2 text-3xl font-semibold tracking-tight'>Execution Scheduling Diagnostics</h1>
					<p className='mt-2 text-sm df-subtle'>Generate focused blocks, apply them to your dedicated calendar, and inspect recent scheduling writes.</p>
				</header>

				<section className='grid gap-3 sm:grid-cols-3'>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>Google Connection</p>
						<p className='mt-1 text-sm text-white'>{googleConnection?.syncState === "connected" ? "Connected" : "Not connected"}</p>
					</article>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>Schedulable Tasks</p>
						<p className='mt-1 text-xl font-semibold text-white'>{schedulableTasks.length}</p>
					</article>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase df-subtle'>Apply Runs (7d)</p>
						<p className='mt-1 text-xl font-semibold text-white'>{appliedEventsLastWeek}</p>
					</article>
				</section>

				<SchedulePlanner tasks={schedulableTasks} />

				<section className='df-panel p-5'>
					<div className='flex items-center justify-between'>
						<h2 className='text-sm font-semibold uppercase tracking-wide df-muted'>Recent Applied Blocks</h2>
						<p className='text-xs df-subtle'>Last {recentLinks.length} writes from schedule apply flow</p>
					</div>

					<div className='mt-4 space-y-2'>
						{recentLinks.length === 0 ? (
							<p className='text-xs df-subtle'>No applied blocks yet. Generate suggestions and apply your first run.</p>
						) : (
							recentLinks.map((link) => (
								<article key={link.id} className='df-card px-3 py-2'>
									<p className='text-sm text-white'>{link.task.title}</p>
									<p className='text-xs df-subtle'>
										{formatDate(link.startAt)} {"->"} {formatDate(link.endAt)}
									</p>
									<p className='text-[11px] df-subtle'>Source: {link.writeSource}</p>
								</article>
							))
						)}
					</div>
				</section>
			</div>
		</main>
	);
}
