export const GOOGLE_OAUTH_STATE_COOKIE = "dueforge_google_oauth_state";

export function getGoogleOauthConfig() {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	const redirectUri = process.env.GOOGLE_REDIRECT_URI;

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
