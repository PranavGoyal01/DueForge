import { getSessionUser } from "@/lib/auth";
import { listGoogleCalendarsForUser } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
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
		return NextResponse.json({ calendars: [], connected: false });
	}

	try {
		const calendars = await listGoogleCalendarsForUser(user.id);
		return NextResponse.json({ calendars, connected: true });
	} catch {
		return NextResponse.json({ calendars: [], connected: true, error: "Could not fetch Google calendars." }, { status: 502 });
	}
}
