export const telemetryEvents = {
	TASK_CREATED: "task.created",
	TASK_COMPLETED: "task.completed",
	COMMITMENT_CREATED: "commitment.created",
	PROOF_SUBMITTED: "proof.submitted",
	CHECKIN_SCHEDULED: "checkin.scheduled",
	SCHEDULE_APPLIED: "schedule.applied",
	NUDGE_SENT: "nudge.sent",
	FEATURE_REQUESTED: "feature.requested",
} as const;

export type TelemetryEvent = (typeof telemetryEvents)[keyof typeof telemetryEvents];

type EventPayload = Record<string, unknown>;

export function logTelemetryEvent(name: TelemetryEvent, payload: EventPayload) {
	// Minimal logger for now; can be replaced with analytics vendor later.
	console.info("[telemetry]", name, payload);
}
