import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommitmentStatus, ProofType, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const proofSchema = z.object({
	type: z.nativeEnum(ProofType).default(ProofType.TEXT),
	content: z.string().min(1).max(5000),
	markCompleted: z.boolean().default(false),
});

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await context.params;
	const payload = await request.json();
	const parsed = proofSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid proof payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const commitment = await prisma.commitment.findFirst({
		where: {
			id,
			committedById: user.id,
		},
	});

	if (!commitment) {
		return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
	}

	const proof = await prisma.$transaction(async (tx) => {
		const createdProof = await tx.proof.create({
			data: {
				commitmentId: id,
				submittedById: user.id,
				type: parsed.data.type,
				content: parsed.data.content,
			},
		});

		if (parsed.data.markCompleted) {
			await tx.commitment.update({
				where: { id: commitment.id },
				data: { status: CommitmentStatus.COMPLETED },
			});

			await tx.task.update({
				where: { id: commitment.taskId },
				data: { status: TaskStatus.DONE },
			});
		}

		return createdProof;
	});

	await prisma.activityEvent.create({
		data: {
			actorId: user.id,
			entityType: "proof",
			entityId: proof.id,
			eventType: "proof.submitted",
			payloadJson: {
				commitmentId: id,
				markCompleted: parsed.data.markCompleted,
			},
		},
	});

	return NextResponse.json({ proof }, { status: 201 });
}
