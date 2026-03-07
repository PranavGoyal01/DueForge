import { getSessionUser } from "@/lib/auth";
import { timingSafeEqual } from "crypto";

type JobAuthContext =
	| {
			mode: "user";
			user: {
				id: string;
				email: string;
			};
	  }
	| {
			mode: "cron";
	  };

function parseBearerToken(headerValue: string | null) {
	if (!headerValue || !headerValue.startsWith("Bearer ")) {
		return null;
	}

	return headerValue.slice("Bearer ".length).trim();
}

function safeTokenMatch(token: string, expected: string) {
	const tokenBuffer = Buffer.from(token);
	const expectedBuffer = Buffer.from(expected);

	if (tokenBuffer.length !== expectedBuffer.length) {
		return false;
	}

	return timingSafeEqual(tokenBuffer, expectedBuffer);
}

export async function authorizeJobRequest(request: Request): Promise<JobAuthContext | null> {
	const sessionUser = await getSessionUser();
	if (sessionUser) {
		return {
			mode: "user",
			user: {
				id: sessionUser.id,
				email: sessionUser.email,
			},
		};
	}

	const expectedSecret = process.env.CRON_SECRET;
	if (!expectedSecret) {
		return null;
	}

	const token = parseBearerToken(request.headers.get("authorization"));
	if (!token) {
		return null;
	}

	if (!safeTokenMatch(token, expectedSecret)) {
		return null;
	}

	return { mode: "cron" };
}
