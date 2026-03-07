import { sendPasswordResetEmail } from "@/lib/account-emails";
import { createAccountToken } from "@/lib/account-tokens";
import { prisma } from "@/lib/prisma";
import { getAppEnv } from "@/lib/validation/env";
import { AccountTokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const forgotSchema = z.object({
	email: z.string().email().max(255),
});

export async function POST(request: Request) {
	getAppEnv();

	const payload = await request.json();
	const parsed = forgotSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid forgot-password payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const email = parsed.data.email.toLowerCase().trim();
	const user = await prisma.user.findUnique({ where: { email } });

	if (user?.passwordHash) {
		const resetToken = await createAccountToken(user.id, AccountTokenType.PASSWORD_RESET, 60);
		await sendPasswordResetEmail({
			email: user.email,
			name: user.name,
			token: resetToken,
		});
	}

	return NextResponse.json({ ok: true });
}
