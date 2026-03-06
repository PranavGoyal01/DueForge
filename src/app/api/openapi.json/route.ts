import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({
		openapi: "3.1.0",
		info: {
			title: "DueForge API",
			version: "0.1.0",
			description: "Execution-first accountability API for tasks, commitments, proof, and scheduling.",
		},
		servers: [{ url: "/" }],
		paths: {
			"/api/auth/register": { post: { summary: "Register user" } },
			"/api/auth/login": { post: { summary: "Login user" } },
			"/api/auth/logout": { post: { summary: "Logout user" } },
			"/api/auth/me": { get: { summary: "Get current user" } },
			"/api/auth/verify-email": { get: { summary: "Verify account email with token" } },
			"/api/auth/forgot-password": { post: { summary: "Start password reset via email" } },
			"/api/auth/reset-password": { post: { summary: "Reset password with recovery token" } },
			"/api/capture/parse": { post: { summary: "Parse natural-language capture" } },
			"/api/tasks": {
				get: { summary: "List tasks" },
				post: { summary: "Create task" },
			},
			"/api/tasks/{id}": { patch: { summary: "Update task" } },
			"/api/tasks/{id}/commit": { post: { summary: "Commit to task" } },
			"/api/commitments": { get: { summary: "List commitments" } },
			"/api/commitments/{id}/proof": { post: { summary: "Submit proof" } },
			"/api/checkins": {
				get: { summary: "List upcoming check-ins" },
				post: { summary: "Schedule check-in" },
			},
			"/api/integrations/google/connect": { post: { summary: "Initiate Google Calendar connect" } },
			"/api/integrations/google/callback": {
				get: { summary: "Handle Google OAuth callback and create dedicated DueForge calendar" },
			},
			"/api/integrations/google/recreate-calendar": {
				post: { summary: "Force recreate dedicated DueForge Google calendar" },
			},
			"/api/integrations/google/calendars": {
				get: { summary: "List connected Google calendars (including shared)" },
			},
			"/api/schedule/suggest": { post: { summary: "Suggest schedule blocks" } },
			"/api/schedule/apply": {
				post: { summary: "Apply schedule blocks by writing events to dedicated DueForge calendar" },
			},
			"/api/health": { get: { summary: "Health check" } },
		},
	});
}
