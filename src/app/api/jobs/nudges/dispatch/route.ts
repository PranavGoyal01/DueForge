import { authorizeJobRequest } from "@/lib/job-auth";
import { sendTransactionalEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { NextResponse } from "next/server";

function formatDate(value: Date | null) {
	if (!value) {
		return "No due date";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
}

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

				if (reminder.channel === "EMAIL") {
					await sendTransactionalEmail({
						to: reminder.user.email,
						subject: `[DueForge] Follow-through reminder: ${commitment.task.title}`,
						text: `Your commitment is still open: ${commitment.task.title}. Due: ${formatDate(commitment.dueAt)}. Add proof to close the loop.`,
						html: `<p>Your commitment is still open:</p><p><strong>${commitment.task.title}</strong></p><p>Due: ${formatDate(commitment.dueAt)}</p><p>Add proof to close the loop.</p>`,
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
			});

			sent += 1;
		} catch {
			await prisma.reminder.update({
				where: { id: reminder.id },
				data: { status: "failed" },
			});
			failed += 1;
		}
	}

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
