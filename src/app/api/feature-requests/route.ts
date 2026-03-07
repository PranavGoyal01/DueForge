import { getSessionUser } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";
import { getAppEnv } from "@/lib/validation/env";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const featureRequestSchema = z.object({
	title: z.string().trim().min(5).max(140),
	problem: z.string().trim().min(10).max(1200),
	impact: z.string().trim().min(10).max(1200),
	name: z.string().trim().max(80).optional(),
	email: z.string().trim().email().max(255).optional(),
	source: z.enum(["demo", "landing"]).default("demo"),
});

export async function POST(request: Request) {
	const payload = await request.json().catch(() => null);
	const parsed = featureRequestSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid feature request payload", issues: parsed.error.flatten() }, { status: 400 });
	}

	const requestId = randomUUID();
	const user = await getSessionUser();
	const data = parsed.data;

	if (user) {
		await prisma.activityEvent.create({
			data: {
				actorId: user.id,
				entityType: "feature_request",
				entityId: requestId,
				eventType: "feature.requested",
				payloadJson: {
					title: data.title,
					problem: data.problem,
					impact: data.impact,
					source: data.source,
					email: data.email,
					name: data.name,
				},
			},
		});
	} else {
		console.info("[feature-request]", {
			requestId,
			title: data.title,
			source: data.source,
			email: data.email,
			name: data.name,
		});
	}

	logTelemetryEvent(telemetryEvents.FEATURE_REQUESTED, {
		requestId,
		source: data.source,
		authenticated: Boolean(user),
		hasEmail: Boolean(data.email),
	});

	const env = getAppEnv();
	const recipient = env.FEATURE_REQUEST_RECIPIENT;
	if (recipient) {
		await sendTransactionalEmail({
			to: recipient,
			subject: `[DueForge] Feature Request ${requestId}`,
			text: [`Reference: ${requestId}`, `Source: ${data.source}`, `Authenticated: ${Boolean(user)}`, `Name: ${data.name ?? "(not provided)"}`, `Email: ${data.email ?? "(not provided)"}`, "", `Title: ${data.title}`, "", `Problem: ${data.problem}`, "", `Impact: ${data.impact}`].join("\n"),
			html: `<p><strong>Reference:</strong> ${requestId}</p><p><strong>Source:</strong> ${data.source}</p><p><strong>Authenticated:</strong> ${Boolean(user)}</p><p><strong>Name:</strong> ${data.name ?? "(not provided)"}</p><p><strong>Email:</strong> ${data.email ?? "(not provided)"}</p><p><strong>Title:</strong> ${data.title}</p><p><strong>Problem:</strong><br/>${data.problem}</p><p><strong>Impact:</strong><br/>${data.impact}</p>`,
		});
	}

	return NextResponse.json({ ok: true, requestId }, { status: 201 });
}
