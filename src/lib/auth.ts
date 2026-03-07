import { prisma } from "@/lib/prisma";
import { getAppEnv } from "@/lib/validation/env";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "dueforge_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
	const { AUTH_SECRET: secret } = getAppEnv();
	return new TextEncoder().encode(secret);
}

type SessionPayload = {
	sub: string;
};

export async function createSessionToken(userId: string) {
	return new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_TTL_SECONDS}s`).sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
	try {
		const { payload } = await jwtVerify(token, getSessionSecret());
		if (!payload.sub || typeof payload.sub !== "string") {
			return null;
		}

		return { sub: payload.sub };
	} catch {
		return null;
	}
}

export function getSessionCookieOptions() {
	return {
		httpOnly: true,
		sameSite: "lax" as const,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: SESSION_TTL_SECONDS,
	};
}

export function getSessionCookieName() {
	return SESSION_COOKIE;
}

export async function getSessionUser() {
	const cookieStore = await cookies();
	const token = cookieStore.get(SESSION_COOKIE)?.value;

	if (!token) {
		return null;
	}

	const payload = await verifySessionToken(token);
	if (!payload) {
		return null;
	}

	return prisma.user.findUnique({
		where: { id: payload.sub },
	});
}
