import { MetricCard } from "@/components/dashboard/MetricCard";
import { SchedulePlanner } from "@/components/SchedulePlanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
		<main className='df-app-page'>
			<div className='mx-auto w-full max-w-6xl space-y-6'>
				<header className='space-y-2'>
					<p className='df-page-kicker'>Schedule</p>
					<h1 className='df-page-title'>Execution Scheduling Diagnostics</h1>
					<p className='df-page-lead'>Generate focused blocks, apply them to your dedicated calendar, and inspect recent scheduling writes.</p>
				</header>

				<section className='grid gap-3 sm:grid-cols-3'>
					<MetricCard label='Google Connection' value={googleConnection?.syncState === "connected" ? "Connected" : "Not connected"} valueClassName='text-sm' />
					<MetricCard label='Schedulable Tasks' value={schedulableTasks.length} valueClassName='text-2xl' />
					<MetricCard label='Apply Runs (7d)' value={appliedEventsLastWeek} valueClassName='text-2xl' />
				</section>

				<SchedulePlanner tasks={schedulableTasks} />

				<Card className='py-5'>
					<CardHeader>
						<div className='flex items-center justify-between'>
							<CardTitle className='text-sm font-semibold uppercase tracking-wide'>Recent Applied Blocks</CardTitle>
							<CardDescription>Last {recentLinks.length} writes from schedule apply flow</CardDescription>
						</div>
					</CardHeader>

					<CardContent className='space-y-2'>
						{recentLinks.length === 0 ? (
							<p className='text-xs text-muted-foreground'>No applied blocks yet. Generate suggestions and apply your first run.</p>
						) : (
							recentLinks.map((link) => (
								<Card key={link.id} size='sm' className='border bg-card/60 py-3'>
									<CardContent>
										<p className='text-sm'>{link.task.title}</p>
										<p className='text-xs text-muted-foreground'>
											{formatDate(link.startAt)} {"->"} {formatDate(link.endAt)}
										</p>
										<p className='text-[11px] text-muted-foreground'>Source: {link.writeSource}</p>
									</CardContent>
								</Card>
							))
						)}
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
