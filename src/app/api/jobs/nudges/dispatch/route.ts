import { authorizeJobRequest } from "@/lib/job-auth";
import { sendTransactionalEmail } from "@/lib/mailer";
import { renderCommitmentNudgeTemplate } from "@/lib/nudges";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { getAppEnv } from "@/lib/validation/env";
import { NextResponse } from "next/server";

async function runNudgeDispatch(request: Request) {
	const auth = await authorizeJobRequest(request);
	if (!auth) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const pending = await prisma.reminder.findMany({
		where: {
			status: "pending",
			sendAt: {
				lte: new Date(),
			},
			...(auth.mode === "user" ? { userId: auth.user.id } : {}),
		},
		include: {
			user: {
				select: {
					id: true,
					email: true,
				},
			},
		},
		orderBy: {
			sendAt: "asc",
		},
		take: auth.mode === "user" ? 50 : 400,
	});

	let sent = 0;
	let failed = 0;
	const touchedUsers = new Set<string>();
	const appBaseUrl = getAppEnv().APP_BASE_URL;

	for (const reminder of pending) {
		touchedUsers.add(reminder.user.id);

		try {
			if (reminder.entityType === "commitment") {
				const commitment = await prisma.commitment.findFirst({
					where: {
						id: reminder.entityId,
						committedById: reminder.user.id,
					},
					include: {
						task: {
							select: {
								title: true,
							},
						},
					},
				});

				if (!commitment) {
					await prisma.reminder.update({
						where: { id: reminder.id },
						data: { status: "failed" },
					});
					failed += 1;
					continue;
				}

				const template = renderCommitmentNudgeTemplate({
					taskTitle: commitment.task.title,
					dueAt: commitment.dueAt,
					appBaseUrl,
				});

				if (reminder.channel === "EMAIL") {
					await sendTransactionalEmail({
						to: reminder.user.email,
						subject: template.emailSubject,
						text: template.emailText,
						html: template.emailHtml,
					});
				}

				await prisma.activityEvent.create({
					data: {
						actorId: reminder.user.id,
						entityType: reminder.entityType,
						entityId: reminder.entityId,
						eventType: "nudge.sent",
						payloadJson: {
							channel: reminder.channel,
							reminderId: reminder.id,
							templateKey: template.templateKey,
							risk: template.risk,
							title: template.title,
							inAppBody: reminder.channel === "IN_APP" ? template.inAppBody : undefined,
						},
					},
				});
			}

			await prisma.reminder.update({
				where: { id: reminder.id },
				data: { status: "sent" },
			});

			logTelemetryEvent(telemetryEvents.NUDGE_SENT, {
				userId: reminder.user.id,
				channel: reminder.channel,
				reminderId: reminder.id,
				entityType: reminder.entityType,
				entityId: reminder.entityId,
			});

			sent += 1;
		} catch {
			await prisma.reminder.update({
				where: { id: reminder.id },
				data: { status: "failed" },
			});

			logTelemetryEvent(telemetryEvents.NUDGE_FAILED, {
				userId: reminder.user.id,
				channel: reminder.channel,
				reminderId: reminder.id,
				entityType: reminder.entityType,
				entityId: reminder.entityId,
			});

			failed += 1;
		}
	}

	logTelemetryEvent(telemetryEvents.NUDGE_DISPATCH_COMPLETED, {
		mode: auth.mode,
		pending: pending.length,
		sent,
		failed,
		affectedUsers: touchedUsers.size,
	});

	return NextResponse.json({
		mode: auth.mode,
		pending: pending.length,
		sent,
		failed,
		affectedUsers: touchedUsers.size,
	});
}

export async function GET(request: Request) {
	return runNudgeDispatch(request);
}

export async function POST(request: Request) {
	return runNudgeDispatch(request);
}
