import { consumeAccountToken } from "@/lib/account-tokens";
import { prisma } from "@/lib/prisma";
import { AccountTokenType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const resetSchema = z.object({
	token: z.string().min(1),
	password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
	const payload = await request.json();
	const parsed = resetSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid reset-password payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const consumed = await consumeAccountToken(parsed.data.token, AccountTokenType.PASSWORD_RESET);
	if (!consumed) {
		return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
	}

	const passwordHash = await bcrypt.hash(parsed.data.password, 10);
	await prisma.user.update({
		where: { id: consumed.userId },
		data: { passwordHash },
	});

	return NextResponse.json({ ok: true });
}
