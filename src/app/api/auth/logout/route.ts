import { getSessionCookieName } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
	const response = NextResponse.json({ success: true });
	response.cookies.set(getSessionCookieName(), "", {
		path: "/",
		maxAge: 0,
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});

	return response;
}
