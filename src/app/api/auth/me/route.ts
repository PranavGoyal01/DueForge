import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return NextResponse.json({
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			timezone: user.timezone,
			motivationProfile: user.motivationProfile,
			emailVerified: Boolean(user.emailVerifiedAt),
		},
	});
}
