import { getSessionUser } from "@/lib/auth";
import { ensureRelationshipForUser } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { CommitmentVisibility } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const commitSchema = z.object({ dueAt: z.string().datetime().optional(), visibilityScope: z.nativeEnum(CommitmentVisibility).default(CommitmentVisibility.PAIR) });

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await context.params;
	const payload = await request.json().catch(() => ({}));
	const parsed = commitSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid commitment payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const relationship = await ensureRelationshipForUser(user.id);
	const priorCommitmentCount = await prisma.commitment.count({ where: { committedById: user.id } });

	const task = await prisma.task.findFirst({ where: { id, ownerId: user.id } });

	if (!task) {
		return NextResponse.json({ error: "Task not found" }, { status: 404 });
	}

	const commitment = await prisma.commitment.create({ data: { taskId: task.id, committedById: user.id, committedToId: relationship?.partnerUserId, dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : task.dueAt, visibilityScope: parsed.data.visibilityScope }, include: { task: true, committedTo: true, proofs: true } });

	await prisma.activityEvent.create({ data: { actorId: user.id, entityType: "commitment", entityId: commitment.id, eventType: "commitment.created", payloadJson: { taskId: task.id } } });

	logTelemetryEvent(telemetryEvents.ACTIVATION_COMMITMENT_CREATED, { userId: user.id, commitmentId: commitment.id, taskId: task.id, isFirstCommitment: priorCommitmentCount === 0, hasDeadline: Boolean(commitment.dueAt), visibilityScope: commitment.visibilityScope });

	return NextResponse.json({ commitment }, { status: 201 });
}
