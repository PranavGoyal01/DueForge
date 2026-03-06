import { getSessionUser } from "@/lib/auth";
import { ensureDedicatedGoogleCalendar } from "@/lib/google-calendar";
import { getGoogleOauthConfig, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type GoogleTokenResponse = {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	scope?: string;
	token_type: string;
};

export async function GET(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	const config = getGoogleOauthConfig();
	if (!config.isConfigured || !config.clientId || !config.clientSecret || !config.redirectUri) {
		return NextResponse.redirect(new URL("/?google=missing_config", request.url));
	}

	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const oauthError = url.searchParams.get("error");

	if (oauthError) {
		return NextResponse.redirect(new URL(`/?google=error&reason=${encodeURIComponent(oauthError)}`, request.url));
	}

	if (!code || !state) {
		return NextResponse.redirect(new URL("/?google=invalid_callback", request.url));
	}

	const cookieStore = await cookies();
	const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
	cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

	if (!expectedState || expectedState !== state) {
		return NextResponse.redirect(new URL("/?google=invalid_state", request.url));
	}

	const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			code,
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: config.redirectUri,
			grant_type: "authorization_code",
		}),
	});

	if (!tokenResponse.ok) {
		return NextResponse.redirect(new URL("/?google=token_exchange_failed", request.url));
	}

	const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

	await prisma.calendarConnection.upsert({
		where: {
			userId_provider: {
				userId: user.id,
				provider: "google",
			},
		},
		update: {
			syncState: "connected",
			tokensRef: JSON.stringify({
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token,
				tokenType: tokenData.token_type,
				scope: tokenData.scope,
				expiresIn: tokenData.expires_in,
				obtainedAt: new Date().toISOString(),
			}),
		},
		create: {
			userId: user.id,
			provider: "google",
			syncState: "connected",
			tokensRef: JSON.stringify({
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token,
				tokenType: tokenData.token_type,
				scope: tokenData.scope,
				expiresIn: tokenData.expires_in,
				obtainedAt: new Date().toISOString(),
			}),
		},
	});

	await prisma.activityEvent.create({
		data: {
			actorId: user.id,
			entityType: "integration",
			entityId: user.id,
			eventType: "google.connected",
			payloadJson: {
				provider: "google",
			},
		},
	});

	try {
		await ensureDedicatedGoogleCalendar(user.id);
	} catch {
		return NextResponse.redirect(new URL("/?google=connected_but_calendar_create_failed", request.url));
	}

	return NextResponse.redirect(new URL("/?google=connected", request.url));
}
