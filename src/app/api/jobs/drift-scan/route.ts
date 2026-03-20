import { authorizeJobRequest } from "@/lib/job-auth";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { NextResponse } from "next/server";

const LOOKBACK_HOURS = 12;
const HORIZON_HOURS = 24;
const DUPLICATE_WINDOW_HOURS = 12;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function parseNumberParam(url: URL, key: string) {
	const raw = url.searchParams.get(key);
	if (!raw) {
		return null;
	}

	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) {
		return null;
	}

	return parsed;
}

async function runDriftScan(request: Request) {
	const auth = await authorizeJobRequest(request);
	if (!auth) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const startedAt = Date.now();
	const runId = crypto.randomUUID();
	const url = new URL(request.url);

	const lookbackHours = clamp(Math.round(parseNumberParam(url, "lookbackHours") ?? LOOKBACK_HOURS), 1, 72);
	const horizonHours = clamp(Math.round(parseNumberParam(url, "horizonHours") ?? HORIZON_HOURS), 1, 168);
	const duplicateWindowHours = clamp(Math.round(parseNumberParam(url, "duplicateWindowHours") ?? DUPLICATE_WINDOW_HOURS), 1, 72);
	const batchLimit = clamp(Math.round(parseNumberParam(url, "limit") ?? (auth.mode === "user" ? 50 : 400)), 1, 600);
	const dryRun = url.searchParams.get("dryRun") === "1";

	const now = new Date();
	const lookback = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
	const horizon = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);
	const duplicateWindow = new Date(now.getTime() - duplicateWindowHours * 60 * 60 * 1000);

	try {
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
			take: batchLimit,
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
				if (!dryRun) {
					await prisma.reminder.create({
						data: {
							userId,
							entityType: "commitment",
							entityId: commitment.id,
							channel: "IN_APP",
							sendAt: now,
						},
					});
				}
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
				if (!dryRun) {
					await prisma.reminder.create({
						data: {
							userId,
							entityType: "commitment",
							entityId: commitment.id,
							channel: "EMAIL",
							sendAt: now,
						},
					});
				}
				queuedEmail += 1;
			}

			if (!dryRun) {
				await prisma.activityEvent.create({
					data: {
						actorId: userId,
						entityType: "commitment",
						entityId: commitment.id,
						eventType: "nudge.queued",
						payloadJson: {
							taskTitle: commitment.task.title,
							dueAt: commitment.dueAt,
							runId,
						},
					},
				});
			}
		}

		const durationMs = Date.now() - startedAt;
		logTelemetryEvent(telemetryEvents.DRIFT_SCAN_COMPLETED, {
			runId,
			mode: auth.mode,
			dryRun,
			lookbackHours,
			horizonHours,
			duplicateWindowHours,
			batchLimit,
			atRiskCommitments: atRiskCommitments.length,
			queuedInApp,
			queuedEmail,
			affectedUsers: touchedUsers.size,
			durationMs,
		});

		return NextResponse.json({
			runId,
			mode: auth.mode,
			dryRun,
			lookbackHours,
			horizonHours,
			duplicateWindowHours,
			batchLimit,
			queued: queuedInApp + queuedEmail,
			queuedInApp,
			queuedEmail,
			atRiskCommitments: atRiskCommitments.length,
			affectedUsers: touchedUsers.size,
			durationMs,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown drift scan error";
		logTelemetryEvent(telemetryEvents.DRIFT_SCAN_FAILED, {
			runId,
			mode: auth.mode,
			dryRun,
			lookbackHours,
			horizonHours,
			duplicateWindowHours,
			batchLimit,
			message,
		});

		return NextResponse.json(
			{
				error: "Drift scan failed",
				runId,
				message,
				},
			{ status: 500 },
		);
	}
}

export async function GET(request: Request) {
	return runDriftScan(request);
}

export async function POST(request: Request) {
	return runDriftScan(request);
}
