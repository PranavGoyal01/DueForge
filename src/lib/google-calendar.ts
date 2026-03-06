import { getGoogleOauthConfig } from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";

type StoredGoogleTokens = {
	accessToken: string;
	refreshToken?: string;
	tokenType: string;
	scope?: string;
	expiresIn: number;
	obtainedAt: string;
	dedicatedCalendarId?: string;
};

type GoogleTokenRefreshResponse = {
	access_token: string;
	expires_in: number;
	scope?: string;
	token_type: string;
};

type GoogleCalendarCreateResponse = {
	id: string;
};

type GoogleCalendarListResponse = {
	items?: Array<{
		id: string;
		summary: string;
		primary?: boolean;
		accessRole?: string;
	}>;
};

type GoogleFreeBusyResponse = {
	calendars?: Record<
		string,
		{
			busy?: Array<{
				start: string;
				end: string;
			}>;
		}
	>;
};

type GoogleCalendarEventCreateResponse = {
	id: string;
	htmlLink?: string;
};

function parseStoredTokens(tokensRef: string | null): StoredGoogleTokens | null {
	if (!tokensRef) {
		return null;
	}

	try {
		const parsed = JSON.parse(tokensRef) as StoredGoogleTokens;
		if (!parsed.accessToken || !parsed.tokenType || !parsed.obtainedAt || !parsed.expiresIn) {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

function shouldRefreshToken(tokens: StoredGoogleTokens) {
	const expiresAt = new Date(tokens.obtainedAt).getTime() + tokens.expiresIn * 1000;
	const refreshThreshold = expiresAt - 60 * 1000;
	return Date.now() >= refreshThreshold;
}

async function refreshGoogleAccessToken(refreshToken: string) {
	const config = getGoogleOauthConfig();
	if (!config.clientId || !config.clientSecret) {
		throw new Error("Google OAuth client is not configured.");
	}

	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		}),
	});

	if (!response.ok) {
		throw new Error("Google token refresh failed.");
	}

	return (await response.json()) as GoogleTokenRefreshResponse;
}

async function getActiveTokensForUser(userId: string) {
	const connection = await prisma.calendarConnection.findUnique({
		where: {
			userId_provider: {
				userId,
				provider: "google",
			},
		},
	});

	if (!connection || connection.syncState !== "connected") {
		throw new Error("Google Calendar is not connected.");
	}

	const stored = parseStoredTokens(connection.tokensRef);
	if (!stored) {
		throw new Error("Google token state is invalid.");
	}

	if (!shouldRefreshToken(stored)) {
		return { connection, tokens: stored };
	}

	if (!stored.refreshToken) {
		throw new Error("Google refresh token is missing.");
	}

	const refreshed = await refreshGoogleAccessToken(stored.refreshToken);
	const updatedTokens: StoredGoogleTokens = {
		...stored,
		accessToken: refreshed.access_token,
		tokenType: refreshed.token_type,
		scope: refreshed.scope ?? stored.scope,
		expiresIn: refreshed.expires_in,
		obtainedAt: new Date().toISOString(),
	};

	const updatedConnection = await prisma.calendarConnection.update({
		where: { id: connection.id },
		data: {
			tokensRef: JSON.stringify(updatedTokens),
			syncState: "connected",
		},
	});

	return { connection: updatedConnection, tokens: updatedTokens };
}

export async function listGoogleCalendarsForUser(userId: string) {
	const { tokens } = await getActiveTokensForUser(userId);

	const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
		headers: {
			Authorization: `Bearer ${tokens.accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to list Google calendars.");
	}

	const body = (await response.json()) as GoogleCalendarListResponse;
	return (body.items ?? []).map((item) => ({
		id: item.id,
		summary: item.summary,
		primary: Boolean(item.primary),
		accessRole: item.accessRole ?? "reader",
		isDedicatedDueForge: item.id === tokens.dedicatedCalendarId,
	}));
}

export async function getGoogleBusyIntervalsForCalendars(userId: string, calendarIds: string[], timeMinIso: string, timeMaxIso: string) {
	if (calendarIds.length === 0) {
		return [] as Array<{ start: string; end: string }>;
	}

	const { tokens } = await getActiveTokensForUser(userId);

	const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${tokens.accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			timeMin: timeMinIso,
			timeMax: timeMaxIso,
			items: calendarIds.map((id) => ({ id })),
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to query Google freebusy.");
	}

	const body = (await response.json()) as GoogleFreeBusyResponse;

	const intervals = Object.values(body.calendars ?? {}).flatMap((calendar) =>
		(calendar.busy ?? []).map((slot) => ({
			start: slot.start,
			end: slot.end,
		})),
	);

	return intervals;
}

async function createDedicatedCalendar(accessToken: string) {
	const calendarName = process.env.DUEFORGE_DEDICATED_CALENDAR_NAME ?? process.env.BUSYBEE_DEDICATED_CALENDAR_NAME ?? "DueForge";

	const response = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			summary: calendarName,
			description: "Dedicated calendar created by DueForge for accountability scheduling.",
			timeZone: "UTC",
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to create DueForge dedicated calendar.");
	}

	const body = (await response.json()) as GoogleCalendarCreateResponse;
	return body.id;
}

export async function ensureDedicatedGoogleCalendar(userId: string) {
	const { connection, tokens } = await getActiveTokensForUser(userId);

	if (tokens.dedicatedCalendarId) {
		return {
			calendarId: tokens.dedicatedCalendarId,
			accessToken: tokens.accessToken,
		};
	}

	const dedicatedCalendarId = await createDedicatedCalendar(tokens.accessToken);
	const updatedTokens: StoredGoogleTokens = {
		...tokens,
		dedicatedCalendarId,
	};

	await prisma.calendarConnection.update({
		where: { id: connection.id },
		data: {
			tokensRef: JSON.stringify(updatedTokens),
			syncState: "connected",
		},
	});

	return {
		calendarId: dedicatedCalendarId,
		accessToken: tokens.accessToken,
	};
}

export async function recreateDedicatedGoogleCalendar(userId: string) {
	const { connection, tokens } = await getActiveTokensForUser(userId);
	const dedicatedCalendarId = await createDedicatedCalendar(tokens.accessToken);

	const updatedTokens: StoredGoogleTokens = {
		...tokens,
		dedicatedCalendarId,
	};

	await prisma.calendarConnection.update({
		where: { id: connection.id },
		data: {
			tokensRef: JSON.stringify(updatedTokens),
			syncState: "connected",
		},
	});

	return {
		calendarId: dedicatedCalendarId,
	};
}

export async function createGoogleCalendarEventForUser(
	userId: string,
	payload: {
		summary: string;
		description?: string;
		startAt: string;
		endAt: string;
	},
) {
	const { calendarId, accessToken } = await ensureDedicatedGoogleCalendar(userId);

	const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			summary: payload.summary,
			description: payload.description,
			start: {
				dateTime: payload.startAt,
			},
			end: {
				dateTime: payload.endAt,
			},
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to create Google Calendar event.");
	}

	const body = (await response.json()) as GoogleCalendarEventCreateResponse;
	return {
		eventId: body.id,
		htmlLink: body.htmlLink,
		calendarId,
	};
}
