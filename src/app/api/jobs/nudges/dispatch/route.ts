import { getSessionUser } from "@/lib/auth";
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

export async function POST() {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const pending = await prisma.reminder.findMany({
		where: {
			userId: user.id,
			status: "pending",
			sendAt: {
				lte: new Date(),
			},
		},
		orderBy: {
			sendAt: "asc",
		},
		take: 50,
	});

	let sent = 0;
	let failed = 0;

	for (const reminder of pending) {
		try {
			if (reminder.entityType === "commitment") {
				const commitment = await prisma.commitment.findFirst({
					where: {
						id: reminder.entityId,
						committedById: user.id,
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
						to: user.email,
						subject: `[DueForge] Follow-through reminder: ${commitment.task.title}`,
						text: `Your commitment is still open: ${commitment.task.title}. Due: ${formatDate(commitment.dueAt)}. Add proof to close the loop.`,
						html: `<p>Your commitment is still open:</p><p><strong>${commitment.task.title}</strong></p><p>Due: ${formatDate(commitment.dueAt)}</p><p>Add proof to close the loop.</p>`,
					});
				}

				await prisma.activityEvent.create({
					data: {
						actorId: user.id,
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
				userId: user.id,
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
		pending: pending.length,
		sent,
		failed,
	});
}
