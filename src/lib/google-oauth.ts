import { getAppEnv } from "@/lib/validation/env";

export const GOOGLE_OAUTH_STATE_COOKIE = "dueforge_google_oauth_state";

export function getGoogleOauthConfig() {
	const env = getAppEnv();
	const clientId = env.GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;
	const redirectUri = env.GOOGLE_REDIRECT_URI;

	return {
		clientId,
		clientSecret,
		redirectUri,
		isConfigured: Boolean(clientId && clientSecret && redirectUri),
	};
}

export function getGoogleScopes() {
	return ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"];
}
