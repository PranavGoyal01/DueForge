import { consumeAccountToken } from "@/lib/account-tokens";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { AccountTokenType } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const url = new URL(request.url);
	const token = url.searchParams.get("token");

	if (!token) {
		return NextResponse.redirect(new URL("/login?verified=missing", request.url));
	}

	const consumed = await consumeAccountToken(token, AccountTokenType.EMAIL_VERIFICATION);

	if (!consumed) {
		return NextResponse.redirect(new URL("/login?verified=invalid", request.url));
	}

	await prisma.user.update({ where: { id: consumed.userId }, data: { emailVerifiedAt: new Date() } });

	logTelemetryEvent(telemetryEvents.AUTH_EMAIL_VERIFIED, { userId: consumed.userId });

	return NextResponse.redirect(new URL("/login?verified=success", request.url));
}
