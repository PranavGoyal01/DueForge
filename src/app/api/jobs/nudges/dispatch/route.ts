import { authorizeJobRequest } from "@/lib/job-auth";
import { sendTransactionalEmail } from "@/lib/mailer";
import { renderCommitmentNudgeTemplate } from "@/lib/nudges";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { getAppEnv } from "@/lib/validation/env";
import { NextResponse } from "next/server";

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

async function runNudgeDispatch(request: Request) {
	const auth = await authorizeJobRequest(request);
	if (!auth) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const startedAt = Date.now();
	const runId = crypto.randomUUID();
	const url = new URL(request.url);
	const batchLimit = clamp(Math.round(parseNumberParam(url, "limit") ?? (auth.mode === "user" ? 50 : 400)), 1, 600);
	const dryRun = url.searchParams.get("dryRun") === "1";

	try {
		const pending = await prisma.reminder.findMany({ where: { status: "pending", sendAt: { lte: new Date() }, ...(auth.mode === "user" ? { userId: auth.user.id } : {}) }, include: { user: { select: { id: true, email: true } } }, orderBy: { sendAt: "asc" }, take: batchLimit });

		let sent = 0;
		let failed = 0;
		const touchedUsers = new Set<string>();
		const appBaseUrl = getAppEnv().APP_BASE_URL;

		for (const reminder of pending) {
			touchedUsers.add(reminder.user.id);

			try {
				if (reminder.entityType === "commitment") {
					const commitment = await prisma.commitment.findFirst({ where: { id: reminder.entityId, committedById: reminder.user.id }, include: { task: { select: { title: true } } } });

					if (!commitment) {
						if (!dryRun) {
							await prisma.reminder.update({ where: { id: reminder.id }, data: { status: "failed" } });
						}
						failed += 1;
						continue;
					}

					const template = renderCommitmentNudgeTemplate({ taskTitle: commitment.task.title, dueAt: commitment.dueAt, appBaseUrl });

					if (reminder.channel === "EMAIL" && !dryRun) {
						await sendTransactionalEmail({ to: reminder.user.email, subject: template.emailSubject, text: template.emailText, html: template.emailHtml });
					}

					if (!dryRun) {
						await prisma.activityEvent.create({ data: { actorId: reminder.user.id, entityType: reminder.entityType, entityId: reminder.entityId, eventType: "nudge.sent", payloadJson: { channel: reminder.channel, reminderId: reminder.id, templateKey: template.templateKey, risk: template.risk, title: template.title, inAppBody: reminder.channel === "IN_APP" ? template.inAppBody : undefined, runId } } });
					}
				}

				if (!dryRun) {
					await prisma.reminder.update({ where: { id: reminder.id }, data: { status: "sent" } });
				}

				logTelemetryEvent(telemetryEvents.NUDGE_SENT, { userId: reminder.user.id, channel: reminder.channel, reminderId: reminder.id, entityType: reminder.entityType, entityId: reminder.entityId, runId, dryRun });

				sent += 1;
			} catch {
				if (!dryRun) {
					await prisma.reminder.update({ where: { id: reminder.id }, data: { status: "failed" } });
				}

				logTelemetryEvent(telemetryEvents.NUDGE_FAILED, { userId: reminder.user.id, channel: reminder.channel, reminderId: reminder.id, entityType: reminder.entityType, entityId: reminder.entityId, runId, dryRun });

				failed += 1;
			}
		}

		const durationMs = Date.now() - startedAt;
		logTelemetryEvent(telemetryEvents.NUDGE_DISPATCH_COMPLETED, { runId, mode: auth.mode, dryRun, batchLimit, pending: pending.length, sent, failed, affectedUsers: touchedUsers.size, durationMs });

		return NextResponse.json({ runId, mode: auth.mode, dryRun, batchLimit, pending: pending.length, sent, failed, affectedUsers: touchedUsers.size, durationMs });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown nudge dispatch error";
		logTelemetryEvent(telemetryEvents.NUDGE_DISPATCH_FAILED, { runId, mode: auth.mode, dryRun, batchLimit, message });

		return NextResponse.json({ error: "Nudge dispatch failed", runId, message }, { status: 500 });
	}
}

export async function GET(request: Request) {
	return runNudgeDispatch(request);
}

export async function POST(request: Request) {
	return runNudgeDispatch(request);
}
