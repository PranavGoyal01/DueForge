import { getSessionUser } from "@/lib/auth";
import { scheduleApplyRequestSchema } from "@/lib/domain/contracts";
import { createGoogleCalendarEventForUser } from "@/lib/google-calendar";
import { createRequestId, reportApiError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	const requestId = createRequestId();
	let userId: string | undefined;

	try {
		const user = await getSessionUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		userId = user.id;

		const payload = await request.json();
		const parsed = scheduleApplyRequestSchema.safeParse(payload);

		if (!parsed.success) {
			return NextResponse.json({ error: "Invalid schedule apply payload", issues: parsed.error.flatten() }, { status: 400 });
		}

		const taskMap = new Map((await prisma.task.findMany({ where: { ownerId: user.id, id: { in: parsed.data.blocks.map((block) => block.taskId) } }, select: { id: true, title: true, details: true } })).map((task) => [task.id, task]));

		type ApplyResult = { taskId: string; startAt: string; endAt: string; status: "applied" | "failed"; title?: string; error?: string; linkId?: string; externalEventId?: string };

		const results: ApplyResult[] = [];
		for (const block of parsed.data.blocks) {
			const task = taskMap.get(block.taskId);
			if (!task) {
				results.push({ taskId: block.taskId, startAt: block.startAt, endAt: block.endAt, status: "failed", error: "Task not found or not owned by user." });
				continue;
			}

			try {
				const createdEvent = await createGoogleCalendarEventForUser(user.id, { summary: `DueForge: ${task.title}`, description: task.details ?? "Scheduled by DueForge accountability workflow.", startAt: block.startAt, endAt: block.endAt });

				const link = await prisma.calendarEventLink.create({ data: { taskId: block.taskId, externalEventId: createdEvent.eventId, startAt: new Date(block.startAt), endAt: new Date(block.endAt), writeSource: "google-dueforge-calendar" } });

				results.push({ taskId: block.taskId, startAt: block.startAt, endAt: block.endAt, status: "applied", title: task.title, linkId: link.id, externalEventId: link.externalEventId });
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown scheduling apply error.";
				results.push({ taskId: block.taskId, startAt: block.startAt, endAt: block.endAt, status: "failed", title: task.title, error: errorMessage });
			}
		}

		const appliedResults = results.filter((result) => result.status === "applied");
		const failedResults = results.filter((result) => result.status === "failed");

		await prisma.activityEvent.create({ data: { actorId: user.id, entityType: "schedule", entityId: user.id, eventType: "schedule.applied", payloadJson: { requestedBlocks: parsed.data.blocks.length, appliedBlocks: appliedResults.length, failedBlocks: failedResults.length, failedTaskIds: failedResults.map((result) => result.taskId) } } });

		return NextResponse.json({ applied: failedResults.length === 0, requestedCount: parsed.data.blocks.length, appliedCount: appliedResults.length, failedCount: failedResults.length, results });
	} catch (error) {
		reportApiError({ route: "/api/schedule/apply", requestId, userId, error });

		return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
	}
}
