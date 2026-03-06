import { createSessionToken, getSessionCookieName, getSessionCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().email().max(255),
	password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
	const payload = await request.json();
	const parsed = loginSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid login payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const user = await prisma.user.findUnique({
		where: { email: parsed.data.email.toLowerCase().trim() },
	});

	if (!user?.passwordHash) {
		return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
	}

	const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
	if (!passwordMatches) {
		return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
	}

	const token = await createSessionToken(user.id);
	const response = NextResponse.json({
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			timezone: user.timezone,
			emailVerified: Boolean(user.emailVerifiedAt),
		},
	});

	response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
	return response;
}
