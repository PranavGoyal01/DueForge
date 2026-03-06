import { getSessionUser } from "@/lib/auth";
import { parseQuickCapture } from "@/lib/capture";
import { NextResponse } from "next/server";
import { z } from "zod";

const captureSchema = z.object({
	input: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await request.json();
	const parsed = captureSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid capture payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const draft = parseQuickCapture(parsed.data.input);
	return NextResponse.json({ draft });
}
