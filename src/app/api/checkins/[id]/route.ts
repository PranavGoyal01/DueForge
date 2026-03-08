import { getSessionUser } from "@/lib/auth";
import { checkInOutcomeUpdateSchema } from "@/lib/domain/contracts";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await context.params;
	if (!id) {
		return NextResponse.json({ error: "Check-in id is required" }, { status: 400 });
	}

	const payload = await request.json();
	const parsed = checkInOutcomeUpdateSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid check-in outcome payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const existing = await prisma.checkIn.findFirst({
		where: {
			id,
			relationship: {
				userId: user.id,
			},
		},
		select: {
			id: true,
		},
	});

	if (!existing) {
		return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
	}

	const checkIn = await prisma.checkIn.update({
		where: {
			id,
		},
		data: {
			outcome: parsed.data.outcome,
			nextCommitments: parsed.data.nextCommitments?.trim() || null,
		},
	});

	await prisma.activityEvent.create({
		data: {
			actorId: user.id,
			entityType: "checkin",
			entityId: checkIn.id,
			eventType: "checkin.outcome.updated",
			payloadJson: {
				hasOutcome: Boolean(checkIn.outcome),
				hasNextCommitments: Boolean(checkIn.nextCommitments),
			},
		},
	});

	return NextResponse.json({ checkIn });
}
