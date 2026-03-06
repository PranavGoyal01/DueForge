import { prisma } from "@/lib/prisma";

const DEFAULT_PARTNER_EMAIL = "accountability@dueforge.local";

export async function ensurePartnerUser() {
	return prisma.user.upsert({
		where: { email: DEFAULT_PARTNER_EMAIL },
		update: {},
		create: {
			email: DEFAULT_PARTNER_EMAIL,
			name: "Accountability Partner",
			timezone: "UTC",
			motivationProfile: "supportive",
		},
	});
}

export async function ensureRelationshipForUser(userId: string) {
	const partner = await ensurePartnerUser();

	if (partner.id === userId) {
		return null;
	}

	return prisma.accountabilityRelationship.upsert({
		where: {
			userId_partnerUserId: {
				userId,
				partnerUserId: partner.id,
			},
		},
		update: {
			active: true,
		},
		create: {
			userId,
			partnerUserId: partner.id,
			role: "peer",
			cadence: "weekly",
			active: true,
		},
	});
}
