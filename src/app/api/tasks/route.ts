import { getSessionUser } from "@/lib/auth";
import { taskCreateRequestSchema } from "@/lib/domain/contracts";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const tasks = await prisma.task.findMany({ where: { ownerId: user.id }, include: { tags: { include: { tag: true } }, commitments: true }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }], take: 100 });

	logTelemetryEvent(telemetryEvents.RETENTION_TASKS_VIEWED, { userId: user.id, count: tasks.length });

	return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await request.json();
	const parsed = taskCreateRequestSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid task payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const { title, details, priority, dueAt, estimatedMinutes, tagNames } = parsed.data;
	const priorTaskCount = await prisma.task.count({ where: { ownerId: user.id } });
	const normalizedTagNames = tagNames.map((name) => name.trim()).filter(Boolean);
	const normalizedTitle = title.trim().toLowerCase();

	const existingTasks = await prisma.task.findMany({ where: { ownerId: user.id, status: { not: TaskStatus.DONE } }, select: { id: true, title: true, status: true } });

	const duplicate = existingTasks.find((task) => task.title.trim().toLowerCase() === normalizedTitle);
	if (duplicate) {
		return NextResponse.json({ error: "Duplicate task is not allowed.", duplicateTaskId: duplicate.id }, { status: 409 });
	}

	const task = await prisma.task.create({ data: { ownerId: user.id, title, details, priority, dueAt: dueAt ? new Date(dueAt) : undefined, estimatedMinutes, status: TaskStatus.TODO, riskScore: dueAt ? 30 : 50 } });

	if (normalizedTagNames.length > 0) {
		const tags = await Promise.all(normalizedTagNames.map((name) => prisma.tag.upsert({ where: { ownerId_name: { ownerId: user.id, name } }, update: {}, create: { ownerId: user.id, name } })));

		await prisma.taskTag.createMany({ data: tags.map((tag) => ({ taskId: task.id, tagId: tag.id })) });
	}

	const hydratedTask = await prisma.task.findUnique({ where: { id: task.id }, include: { tags: { include: { tag: true } }, commitments: true } });

	await prisma.activityEvent.create({ data: { actorId: user.id, entityType: "task", entityId: task.id, eventType: "task.created", payloadJson: { title, hasDueDate: Boolean(dueAt) } } });

	logTelemetryEvent(telemetryEvents.ACTIVATION_TASK_CREATED, { userId: user.id, taskId: task.id, isFirstTask: priorTaskCount === 0, hasDueDate: Boolean(dueAt), hasTags: normalizedTagNames.length > 0, priority });

	return NextResponse.json({ task: hydratedTask }, { status: 201 });
}
