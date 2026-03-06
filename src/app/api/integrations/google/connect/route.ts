import { getSessionUser } from "@/lib/auth";
import { getGoogleOauthConfig, getGoogleScopes, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const config = getGoogleOauthConfig();
	if (!config.isConfigured || !config.clientId || !config.redirectUri) {
		return NextResponse.json(
			{
				error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.",
			},
			{ status: 500 },
		);
	}

	const state = randomBytes(24).toString("hex");
	const cookieStore = await cookies();
	cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 60 * 10,
	});

	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		response_type: "code",
		access_type: "offline",
		prompt: "consent",
		include_granted_scopes: "true",
		scope: getGoogleScopes().join(" "),
		state,
	});

	const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

	await prisma.calendarConnection.upsert({
		where: {
			userId_provider: {
				userId: user.id,
				provider: "google",
			},
		},
		update: {
			syncState: "pending_oauth",
		},
		create: {
			userId: user.id,
			provider: "google",
			syncState: "pending_oauth",
		},
	});

	return NextResponse.json({
		connected: false,
		provider: "google",
		authUrl,
		message: "Open the authUrl to continue Google Calendar authorization.",
	});
}
