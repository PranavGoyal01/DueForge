import { sendEmailVerificationEmail } from "@/lib/account-emails";
import { createAccountToken } from "@/lib/account-tokens";
import { createSessionToken, getSessionCookieName, getSessionCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppEnv } from "@/lib/validation/env";
import { AccountTokenType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
	name: z.string().min(1).max(80),
	email: z.string().email().max(255),
	password: z.string().min(8).max(128),
	timezone: z.string().min(1).max(80).default("UTC"),
});

export async function POST(request: Request) {
	getAppEnv();

	const payload = await request.json();
	const parsed = registerSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid register payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const normalizedEmail = parsed.data.email.toLowerCase().trim();
	const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
	if (existing) {
		return NextResponse.json({ error: "Email already in use" }, { status: 409 });
	}

	const passwordHash = await bcrypt.hash(parsed.data.password, 10);
	const user = await prisma.user.create({
		data: {
			name: parsed.data.name,
			email: normalizedEmail,
			passwordHash,
			timezone: parsed.data.timezone,
			motivationProfile: "execution-focused",
		},
	});

	const verifyToken = await createAccountToken(user.id, AccountTokenType.EMAIL_VERIFICATION, 60 * 24);
	await sendEmailVerificationEmail({
		email: user.email,
		name: user.name,
		token: verifyToken,
	});

	const token = await createSessionToken(user.id);
	const response = NextResponse.json({
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			timezone: user.timezone,
			emailVerified: Boolean(user.emailVerifiedAt),
		},
		verificationEmailSent: true,
	});

	response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
	return response;
}
