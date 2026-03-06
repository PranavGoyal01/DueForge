import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateTaskSchema = z.object({
	title: z.string().min(1).max(140).optional(),
	details: z.string().max(5000).nullable().optional(),
	status: z.nativeEnum(TaskStatus).optional(),
	priority: z.number().int().min(1).max(3).optional(),
	dueAt: z.string().datetime().nullable().optional(),
	riskScore: z.number().int().min(0).max(100).optional(),
});

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await context.params;
	const payload = await request.json();
	const parsed = updateTaskSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid update payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const existing = await prisma.task.findFirst({
		where: {
			id,
			ownerId: user.id,
		},
	});

	if (!existing) {
		return NextResponse.json({ error: "Task not found" }, { status: 404 });
	}

	const task = await prisma.task.update({
		where: { id },
		data: {
			...parsed.data,
			dueAt: parsed.data.dueAt === undefined ? undefined : parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
		},
	});

	await prisma.activityEvent.create({
		data: {
			actorId: user.id,
			entityType: "task",
			entityId: id,
			eventType: "task.updated",
			payloadJson: parsed.data,
		},
	});

	return NextResponse.json({ task });
}
