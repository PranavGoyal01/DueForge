import { prisma } from "@/lib/prisma";
import { generateRawToken, hashToken } from "@/lib/token-utils";
import { AccountTokenType } from "@prisma/client";

export async function createAccountToken(userId: string, type: AccountTokenType, ttlMinutes: number) {
	const rawToken = generateRawToken();
	const tokenHash = hashToken(rawToken);

	await prisma.accountToken.deleteMany({
		where: {
			userId,
			type,
			usedAt: null,
		},
	});

	const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

	await prisma.accountToken.create({
		data: {
			userId,
			type,
			tokenHash,
			expiresAt,
		},
	});

	return rawToken;
}

export async function consumeAccountToken(rawToken: string, type: AccountTokenType) {
	const tokenHash = hashToken(rawToken);
	const now = new Date();

	const token = await prisma.accountToken.findFirst({
		where: {
			tokenHash,
			type,
			usedAt: null,
			expiresAt: {
				gt: now,
			},
		},
	});

	if (!token) {
		return null;
	}

	await prisma.accountToken.update({
		where: { id: token.id },
		data: { usedAt: now },
	});

	return token;
}
