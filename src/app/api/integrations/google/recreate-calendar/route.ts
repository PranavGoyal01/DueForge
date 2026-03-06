import { getSessionUser } from "@/lib/auth";
import { recreateDedicatedGoogleCalendar } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const connection = await prisma.calendarConnection.findUnique({
		where: {
			userId_provider: {
				userId: user.id,
				provider: "google",
			},
		},
	});

	if (!connection || connection.syncState !== "connected") {
		return NextResponse.json({ error: "Google Calendar is not connected." }, { status: 400 });
	}

	const result = await recreateDedicatedGoogleCalendar(user.id);

	await prisma.activityEvent.create({
		data: {
			actorId: user.id,
			entityType: "integration",
			entityId: user.id,
			eventType: "google.dedicated_calendar_recreated",
			payloadJson: {
				calendarId: result.calendarId,
			},
		},
	});

	return NextResponse.json({ success: true, calendarId: result.calendarId });
}
