import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const LOOKBACK_HOURS = 12;
const HORIZON_HOURS = 24;
const DUPLICATE_WINDOW_HOURS = 12;

export async function POST() {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const now = new Date();
	const lookback = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
	const horizon = new Date(now.getTime() + HORIZON_HOURS * 60 * 60 * 1000);
	const duplicateWindow = new Date(now.getTime() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000);

	const atRiskCommitments = await prisma.commitment.findMany({
		where: {
			committedById: user.id,
			status: "COMMITTED",
			dueAt: {
				gte: lookback,
				lte: horizon,
			},
			proofs: {
				none: {},
			},
		},
		include: {
			task: {
				select: {
					title: true,
				},
			},
		},
		orderBy: {
			dueAt: "asc",
		},
		take: 50,
	});

	let queuedInApp = 0;
	let queuedEmail = 0;

	for (const commitment of atRiskCommitments) {
		const existingInApp = await prisma.reminder.findFirst({
			where: {
				userId: user.id,
				entityType: "commitment",
				entityId: commitment.id,
				channel: "IN_APP",
				status: {
					in: ["pending", "sent"],
				},
				createdAt: {
					gte: duplicateWindow,
				},
			},
		});

		if (!existingInApp) {
			await prisma.reminder.create({
				data: {
					userId: user.id,
					entityType: "commitment",
					entityId: commitment.id,
					channel: "IN_APP",
					sendAt: now,
				},
			});
			queuedInApp += 1;
		}

		const existingEmail = await prisma.reminder.findFirst({
			where: {
				userId: user.id,
				entityType: "commitment",
				entityId: commitment.id,
				channel: "EMAIL",
				status: {
					in: ["pending", "sent"],
				},
				createdAt: {
					gte: duplicateWindow,
				},
			},
		});

		if (!existingEmail) {
			await prisma.reminder.create({
				data: {
					userId: user.id,
					entityType: "commitment",
					entityId: commitment.id,
					channel: "EMAIL",
					sendAt: now,
				},
			});
			queuedEmail += 1;
		}

		await prisma.activityEvent.create({
			data: {
				actorId: user.id,
				entityType: "commitment",
				entityId: commitment.id,
				eventType: "nudge.queued",
				payloadJson: {
					taskTitle: commitment.task.title,
					dueAt: commitment.dueAt,
				},
			},
		});
	}

	return NextResponse.json({
		queued: queuedInApp + queuedEmail,
		queuedInApp,
		queuedEmail,
		atRiskCommitments: atRiskCommitments.length,
	});
}
