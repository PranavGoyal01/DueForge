import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({
		ok: true,
		service: "dueforge",
		timestamp: new Date().toISOString(),
	});
}
