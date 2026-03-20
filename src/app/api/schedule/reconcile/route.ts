import { getSessionUser } from "@/lib/auth";
import { scheduleReconcileRequestSchema } from "@/lib/domain/contracts";
import { getGoogleBusyIntervalsForCalendars, listGoogleCalendarsForUser } from "@/lib/google-calendar";
import { createRequestId, reportApiError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { NextResponse } from "next/server";

type BusyInterval = { start: Date; end: Date };

function minutesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
	const start = Math.max(aStart.getTime(), bStart.getTime());
	const end = Math.min(aEnd.getTime(), bEnd.getTime());
	if (end <= start) {
		return 0;
	}

	return Math.round((end - start) / (1000 * 60));
}

function getSeverity(overlapMinutes: number) {
	if (overlapMinutes >= 45) {
		return "high" as const;
	}
	if (overlapMinutes >= 20) {
		return "medium" as const;
	}
	return "low" as const;
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

		const payload = await request.json().catch(() => ({}));
		const parsed = scheduleReconcileRequestSchema.safeParse(payload);
		if (!parsed.success) {
			return NextResponse.json({ error: "Invalid reconcile payload", issues: parsed.error.flatten() }, { status: 400 });
		}

		const now = new Date();
		const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

		const links = await prisma.calendarEventLink.findMany({ where: { task: { ownerId: user.id }, endAt: { gte: now }, startAt: { lte: horizon } }, include: { task: { select: { id: true, title: true } } }, orderBy: { startAt: "asc" }, take: 80 });

		if (links.length === 0) {
			return NextResponse.json({ checkedCount: 0, conflictCount: 0, externalCalendarCount: 0, conflicts: [] });
		}

		let calendars = [] as Awaited<ReturnType<typeof listGoogleCalendarsForUser>>;
		try {
			calendars = await listGoogleCalendarsForUser(user.id);
		} catch {
			return NextResponse.json({ error: "Could not load Google calendars for reconciliation." }, { status: 502 });
		}

		const availableExternalCalendarIds = calendars.filter((calendar) => !calendar.isDedicatedDueForge).map((calendar) => calendar.id);
		const selectedCalendarIds = (parsed.data.calendarIds?.length ? parsed.data.calendarIds : availableExternalCalendarIds).filter((id) => availableExternalCalendarIds.includes(id));

		if (selectedCalendarIds.length === 0) {
			return NextResponse.json({ checkedCount: links.length, conflictCount: 0, externalCalendarCount: 0, conflicts: [], message: "No non-DueForge calendars selected for reconciliation." });
		}

		let busyIntervals: BusyInterval[] = [];
		try {
			const intervals = await getGoogleBusyIntervalsForCalendars(user.id, selectedCalendarIds, now.toISOString(), horizon.toISOString());
			busyIntervals = intervals.map((interval) => ({ start: new Date(interval.start), end: new Date(interval.end) }));
		} catch {
			return NextResponse.json({ error: "Could not load external free/busy intervals for reconciliation." }, { status: 502 });
		}

		const conflicts = links
			.map((link) => {
				const maxOverlapMinutes = busyIntervals.reduce((max, interval) => {
					const overlap = minutesOverlap(link.startAt, link.endAt, interval.start, interval.end);
					return Math.max(max, overlap);
				}, 0);

				if (maxOverlapMinutes <= 0) {
					return null;
				}

				const severity = getSeverity(maxOverlapMinutes);
				return { linkId: link.id, taskId: link.task.id, title: link.task.title, startAt: link.startAt.toISOString(), endAt: link.endAt.toISOString(), overlapMinutes: maxOverlapMinutes, severity, recommendation: severity === "high" ? "Reschedule immediately or shorten this block." : "Review and adjust this block if needed." };
			})
			.filter((item): item is NonNullable<typeof item> => Boolean(item));

		await prisma.activityEvent.create({ data: { actorId: user.id, entityType: "schedule", entityId: user.id, eventType: "schedule.reconciled", payloadJson: { checkedCount: links.length, conflictCount: conflicts.length, externalCalendarCount: selectedCalendarIds.length } } });

		logTelemetryEvent(telemetryEvents.SCHEDULE_RECONCILED, { userId: user.id, checkedCount: links.length, conflictCount: conflicts.length, externalCalendarCount: selectedCalendarIds.length });

		return NextResponse.json({ checkedCount: links.length, conflictCount: conflicts.length, externalCalendarCount: selectedCalendarIds.length, conflicts });
	} catch (error) {
		reportApiError({ route: "/api/schedule/reconcile", requestId, userId, error });

		return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
	}
}
