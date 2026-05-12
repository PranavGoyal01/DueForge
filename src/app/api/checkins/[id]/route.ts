import { getSessionUser } from "@/lib/auth";
import { checkInOutcomeUpdateSchema } from "@/lib/domain/contracts";
import { createRequestId, reportApiError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
	const requestId = createRequestId();
	let userId: string | undefined;

	try {
		const user = await getSessionUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		userId = user.id;

		const { id } = await context.params;
		if (!id) {
			return NextResponse.json({ error: "Check-in id is required" }, { status: 400 });
		}

		const payload = await request.json();
		const parsed = checkInOutcomeUpdateSchema.safeParse(payload);

		if (!parsed.success) {
			return NextResponse.json({ error: "Invalid check-in outcome payload", issues: parsed.error.flatten() }, { status: 400 });
		}

		const existing = await prisma.checkIn.findFirst({ where: { id, relationship: { userId: user.id } }, select: { id: true } });

		if (!existing) {
			return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
		}

		const checkIn = await prisma.checkIn.update({ where: { id }, data: { outcome: parsed.data.outcome, nextCommitments: parsed.data.nextCommitments?.trim() || null } });

		await prisma.activityEvent.create({ data: { actorId: user.id, entityType: "checkin", entityId: checkIn.id, eventType: "checkin.outcome.updated", payloadJson: { hasOutcome: Boolean(checkIn.outcome), hasNextCommitments: Boolean(checkIn.nextCommitments) } } });

		logTelemetryEvent(telemetryEvents.CHECKIN_OUTCOME_LOGGED, { userId: user.id, checkInId: checkIn.id, hasNextCommitments: Boolean(checkIn.nextCommitments), outcomeLength: checkIn.outcome?.length ?? 0 });

		return NextResponse.json({ checkIn });
	} catch (error) {
		reportApiError({ route: "/api/checkins/[id]", requestId, userId, error });

		return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
	}
}

export async function DELETE(_request: Request, context: RouteContext) {
	const requestId = createRequestId();
	let userId: string | undefined;

	try {
		const user = await getSessionUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		userId = user.id;

		const { id } = await context.params;
		if (!id) {
			return NextResponse.json({ error: "Check-in id is required" }, { status: 400 });
		}

		const existing = await prisma.checkIn.findFirst({
			where: { id, relationship: { userId: user.id } },
			select: { id: true, scheduledAt: true },
		});

		if (!existing) {
			return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
		}

		await prisma.checkIn.delete({ where: { id: existing.id } });

		await prisma.activityEvent.create({
			data: {
				actorId: user.id,
				entityType: "checkin",
				entityId: existing.id,
				eventType: "checkin.deleted",
				payloadJson: { scheduledAt: existing.scheduledAt.toISOString() },
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		reportApiError({ route: "/api/checkins/[id]", requestId, userId, error });

		return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
	}
}
