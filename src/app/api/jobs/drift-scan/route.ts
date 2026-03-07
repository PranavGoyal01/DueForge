import { authorizeJobRequest } from "@/lib/job-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const LOOKBACK_HOURS = 12;
const HORIZON_HOURS = 24;
const DUPLICATE_WINDOW_HOURS = 12;

async function runDriftScan(request: Request) {
	const auth = await authorizeJobRequest(request);
	if (!auth) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const now = new Date();
	const lookback = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
	const horizon = new Date(now.getTime() + HORIZON_HOURS * 60 * 60 * 1000);
	const duplicateWindow = new Date(now.getTime() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000);

	const atRiskCommitments = await prisma.commitment.findMany({
		where: {
			status: "COMMITTED",
			dueAt: {
				gte: lookback,
				lte: horizon,
			},
			proofs: {
				none: {},
			},
			...(auth.mode === "user" ? { committedById: auth.user.id } : {}),
		},
		include: {
			task: {
				select: {
					title: true,
				},
			},
			committedBy: {
				select: {
					id: true,
				},
			},
		},
		orderBy: {
			dueAt: "asc",
		},
		take: auth.mode === "user" ? 50 : 400,
	});

	let queuedInApp = 0;
	let queuedEmail = 0;
	const touchedUsers = new Set<string>();

	for (const commitment of atRiskCommitments) {
		const userId = commitment.committedBy.id;
		touchedUsers.add(userId);

		const existingInApp = await prisma.reminder.findFirst({
			where: {
				userId,
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
					userId,
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
				userId,
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
					userId,
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
				actorId: userId,
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
		mode: auth.mode,
		queued: queuedInApp + queuedEmail,
		queuedInApp,
		queuedEmail,
		atRiskCommitments: atRiskCommitments.length,
		affectedUsers: touchedUsers.size,
	});
}

export async function GET(request: Request) {
	return runDriftScan(request);
}

export async function POST(request: Request) {
	return runDriftScan(request);
}
