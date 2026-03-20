import { getSessionUser } from "@/lib/auth";
import { proofCreateSchema } from "@/lib/domain/contracts";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { CommitmentStatus, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const proofRequestSchema = proofCreateSchema.omit({ commitmentId: true });

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await context.params;
	const payload = await request.json();
	const parsed = proofRequestSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid proof payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const commitment = await prisma.commitment.findFirst({ where: { id, committedById: user.id } });

	if (!commitment) {
		return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
	}

	const priorProofCount = await prisma.proof.count({ where: { submittedById: user.id } });

	const proof = await prisma.$transaction(async (tx) => {
		const createdProof = await tx.proof.create({ data: { commitmentId: id, submittedById: user.id, type: parsed.data.type, content: parsed.data.content } });

		if (parsed.data.markCompleted) {
			await tx.commitment.update({ where: { id: commitment.id }, data: { status: CommitmentStatus.COMPLETED } });

			await tx.task.update({ where: { id: commitment.taskId }, data: { status: TaskStatus.DONE } });
		}

		return createdProof;
	});

	await prisma.activityEvent.create({ data: { actorId: user.id, entityType: "proof", entityId: proof.id, eventType: "proof.submitted", payloadJson: { commitmentId: id, markCompleted: parsed.data.markCompleted } } });

	logTelemetryEvent(telemetryEvents.ACTIVATION_PROOF_SUBMITTED, { userId: user.id, proofId: proof.id, commitmentId: id, isFirstProof: priorProofCount === 0, proofType: proof.type, markCompleted: parsed.data.markCompleted });

	return NextResponse.json({ proof }, { status: 201 });
}
