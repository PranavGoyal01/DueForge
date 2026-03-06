import { getSessionUser } from "@/lib/auth";
import { createGoogleCalendarEventForUser } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const applySchema = z.object({
	blocks: z
		.array(
			z.object({
				taskId: z.string().min(1),
				startAt: z.string().datetime(),
				endAt: z.string().datetime(),
			}),
		)
		.min(1),
});

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await request.json();
	const parsed = applySchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid schedule apply payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const taskMap = new Map(
		(
			await prisma.task.findMany({
				where: {
					ownerId: user.id,
					id: {
						in: parsed.data.blocks.map((block) => block.taskId),
					},
				},
				select: {
					id: true,
					title: true,
					details: true,
				},
			})
		).map((task) => [task.id, task]),
	);

	const links = await Promise.all(
		parsed.data.blocks.map(async (block) => {
			const task = taskMap.get(block.taskId);
			if (!task) {
				throw new Error("Task not found or not owned by user.");
			}

			const createdEvent = await createGoogleCalendarEventForUser(user.id, {
				summary: `DueForge: ${task.title}`,
				description: task.details ?? "Scheduled by DueForge accountability workflow.",
				startAt: block.startAt,
				endAt: block.endAt,
			});

			return prisma.calendarEventLink.create({
				data: {
					taskId: block.taskId,
					externalEventId: createdEvent.eventId,
					startAt: new Date(block.startAt),
					endAt: new Date(block.endAt),
					writeSource: "google-dueforge-calendar",
				},
			});
		}),
	);

	await prisma.activityEvent.create({
		data: {
			actorId: user.id,
			entityType: "schedule",
			entityId: user.id,
			eventType: "schedule.applied",
			payloadJson: {
				blocks: parsed.data.blocks.length,
			},
		},
	});

	return NextResponse.json({ applied: true, links });
}
