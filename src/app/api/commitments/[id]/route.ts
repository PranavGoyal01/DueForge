import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await context.params;

	const existing = await prisma.commitment.findFirst({
		where: { id, committedById: user.id },
		select: { id: true, taskId: true },
	});

	if (!existing) {
		return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
	}

	await prisma.commitment.delete({ where: { id: existing.id } });

	await prisma.activityEvent.create({
		data: {
			actorId: user.id,
			entityType: "commitment",
			entityId: existing.id,
			eventType: "commitment.deleted",
			payloadJson: { taskId: existing.taskId },
		},
	});

	return NextResponse.json({ success: true });
}
