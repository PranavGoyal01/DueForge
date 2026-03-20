import { getSessionUser } from "@/lib/auth";
import { scheduleSuggestRequestSchema } from "@/lib/domain/contracts";
import { getGoogleBusyIntervalsForCalendars, listGoogleCalendarsForUser } from "@/lib/google-calendar";
import { createRequestId, reportApiError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function computeConfidence(input: { priority: number; dueAt: Date | null; usedFallback: boolean; calendarCount: number; durationMinutes: number }) {
	let score = 58;

	if (input.priority === 1) {
		score += 14;
	} else if (input.priority === 2) {
		score += 8;
	} else {
		score += 3;
	}

	if (input.dueAt) {
		const hoursUntilDue = (input.dueAt.getTime() - Date.now()) / (1000 * 60 * 60);
		if (hoursUntilDue <= 24) {
			score += 14;
		} else if (hoursUntilDue <= 72) {
			score += 10;
		} else if (hoursUntilDue <= 7 * 24) {
			score += 6;
		} else {
			score += 2;
		}
	}

	if (input.durationMinutes >= 120) {
		score -= 4;
	}

	if (input.calendarCount === 0) {
		score -= 12;
	}

	if (input.usedFallback) {
		score -= 24;
	}

	return clamp(Math.round(score), 15, 98);
}

export async function POST(request: Request) {
	const requestId = createRequestId();
	let userId: string | undefined;

	try {
		const user = await getSessionUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		userId = user.id;

		const payload = await request.json();
		const parsed = scheduleSuggestRequestSchema.safeParse(payload);

		if (!parsed.success) {
			return NextResponse.json({ error: "Invalid scheduling payload", issues: parsed.error.flatten() }, { status: 400 });
		}

		const tasks = await prisma.task.findMany({ where: { ownerId: user.id, id: { in: parsed.data.taskIds } }, orderBy: [{ priority: "asc" }, { dueAt: "asc" }] });

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
			busyIntervals = intervals.map((interval) => ({ start: new Date(interval.start), end: new Date(interval.end) })).sort((a, b) => a.start.getTime() - b.start.getTime());
		} catch {
			busyIntervals = [];
		}

		let slot = nextTopOfHour();
		const suggestions = tasks.map((task) => {
			const duration = task.estimatedMinutes ?? 45;
			const proposal = proposeSlot(duration, busyIntervals, slot);
			const usedFallback = !proposal;
			const confidence = computeConfidence({ priority: task.priority, dueAt: task.dueAt, usedFallback, calendarCount: selectedCalendarIds.length, durationMinutes: duration });

			if (!proposal) {
				const fallbackStart = slot.toISOString();
				const fallbackEnd = new Date(slot.getTime() + duration * 60 * 1000).toISOString();
				return { taskId: task.id, title: task.title, startAt: fallbackStart, endAt: fallbackEnd, reason: "No fully-free slot found in 14-day window; fallback slot suggested.", confidence };
			}

			const startAt = proposal.startAt;
			const endAt = proposal.endAt;

			busyIntervals.push({ start: startAt, end: endAt });
			slot = new Date(endAt.getTime() + 15 * 60 * 1000);

			return { taskId: task.id, title: task.title, startAt: startAt.toISOString(), endAt: endAt.toISOString(), reason: "Priority, due date proximity, selected-calendar availability, and focus-time batching.", confidence };
		});

		await prisma.activityEvent.create({ data: { actorId: user.id, entityType: "schedule", entityId: user.id, eventType: "schedule.suggested", payloadJson: { taskIds: parsed.data.taskIds, selectedCalendarIds, suggestionCount: suggestions.length, suggestions: suggestions.map((item) => ({ taskId: item.taskId, startAt: item.startAt, endAt: item.endAt, reason: item.reason, confidence: item.confidence })) } } });

		return NextResponse.json({ suggestions, selectedCalendarIds });
	} catch (error) {
		reportApiError({ route: "/api/schedule/suggest", requestId, userId, error });

		return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
	}
}
