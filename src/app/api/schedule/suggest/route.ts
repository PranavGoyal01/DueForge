import { getSessionUser } from "@/lib/auth";
import { getGoogleBusyIntervalsForCalendars, listGoogleCalendarsForUser } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const suggestSchema = z.object({
	taskIds: z.array(z.string().min(1)).min(1).max(10),
	calendarIds: z.array(z.string().min(1)).max(50).optional(),
});

function nextTopOfHour(date = new Date()) {
	const next = new Date(date);
	next.setMinutes(0, 0, 0);
	next.setHours(next.getHours() + 1);
	return next;
}

function overlaps(startAt: Date, endAt: Date, busyIntervals: Array<{ start: Date; end: Date }>) {
	return busyIntervals.some((interval) => startAt < interval.end && endAt > interval.start);
}

function proposeSlot(durationMinutes: number, busyIntervals: Array<{ start: Date; end: Date }>, earliestStart: Date) {
	let cursor = new Date(earliestStart);
	const limit = new Date(earliestStart);
	limit.setDate(limit.getDate() + 14);

	while (cursor < limit) {
		const endAt = new Date(cursor.getTime() + durationMinutes * 60 * 1000);
		if (!overlaps(cursor, endAt, busyIntervals)) {
			return { startAt: cursor, endAt };
		}

		cursor = new Date(cursor.getTime() + 15 * 60 * 1000);
	}

	return null;
}

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await request.json();
	const parsed = suggestSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid scheduling payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const tasks = await prisma.task.findMany({
		where: {
			ownerId: user.id,
			id: {
				in: parsed.data.taskIds,
			},
		},
		orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
	});

	let selectedCalendarIds = parsed.data.calendarIds ?? [];
	if (selectedCalendarIds.length === 0) {
		try {
			const calendars = await listGoogleCalendarsForUser(user.id);
			selectedCalendarIds = calendars.map((calendar) => calendar.id);
		} catch {
			selectedCalendarIds = [];
		}
	}

	const timeMin = new Date().toISOString();
	const timeMax = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

	let busyIntervals: Array<{ start: Date; end: Date }> = [];
	try {
		const intervals = await getGoogleBusyIntervalsForCalendars(user.id, selectedCalendarIds, timeMin, timeMax);
		busyIntervals = intervals
			.map((interval) => ({
				start: new Date(interval.start),
				end: new Date(interval.end),
			}))
			.sort((a, b) => a.start.getTime() - b.start.getTime());
	} catch {
		busyIntervals = [];
	}

	let slot = nextTopOfHour();
	const suggestions = tasks.map((task) => {
		const duration = task.estimatedMinutes ?? 45;
		const proposal = proposeSlot(duration, busyIntervals, slot);

		if (!proposal) {
			return {
				taskId: task.id,
				title: task.title,
				startAt: slot.toISOString(),
				endAt: new Date(slot.getTime() + duration * 60 * 1000).toISOString(),
				reason: "No fully-free slot found in 14-day window; fallback slot suggested.",
			};
		}

		const startAt = proposal.startAt;
		const endAt = proposal.endAt;

		busyIntervals.push({ start: startAt, end: endAt });
		slot = new Date(endAt.getTime() + 15 * 60 * 1000);

		return {
			taskId: task.id,
			title: task.title,
			startAt: startAt.toISOString(),
			endAt: endAt.toISOString(),
			reason: "Priority, due date proximity, selected-calendar availability, and focus-time batching.",
		};
	});

	return NextResponse.json({ suggestions, selectedCalendarIds });
}
