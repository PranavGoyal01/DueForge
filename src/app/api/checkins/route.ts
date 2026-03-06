import { getSessionUser } from "@/lib/auth";
import { ensureRelationshipForUser } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { CheckInMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const checkInSchema = z.object({
	scheduledAt: z.string().datetime(),
	mode: z.nativeEnum(CheckInMode).default(CheckInMode.VIDEO),
	agenda: z.string().max(2000).optional(),
});

export async function GET() {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const now = new Date();
	const twoWeeks = new Date(now);
	twoWeeks.setDate(now.getDate() + 14);

	const checkIns = await prisma.checkIn.findMany({
		where: {
			relationship: {
				userId: user.id,
			},
			scheduledAt: {
				gte: now,
				lte: twoWeeks,
			},
		},
		include: {
			relationship: {
				include: {
					partnerUser: true,
				},
			},
		},
		orderBy: {
			scheduledAt: "asc",
		},
	});

	return NextResponse.json({ checkIns });
}

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await request.json();
	const parsed = checkInSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid check-in payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const relationship = await ensureRelationshipForUser(user.id);

	if (!relationship) {
		return NextResponse.json({ error: "Relationship unavailable" }, { status: 400 });
	}

	const checkIn = await prisma.checkIn.create({
		data: {
			relationshipId: relationship.id,
			scheduledAt: new Date(parsed.data.scheduledAt),
			mode: parsed.data.mode,
			agenda: parsed.data.agenda,
		},
	});

	await prisma.activityEvent.create({
		data: {
			actorId: user.id,
			entityType: "checkin",
			entityId: checkIn.id,
			eventType: "checkin.scheduled",
			payloadJson: {
				scheduledAt: checkIn.scheduledAt,
			},
		},
	});

	return NextResponse.json({ checkIn }, { status: 201 });
}
