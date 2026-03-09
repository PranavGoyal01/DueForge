export const telemetryEvents = {
	TASK_CREATED: "task.created",
	TASK_COMPLETED: "task.completed",
	COMMITMENT_CREATED: "commitment.created",
	PROOF_SUBMITTED: "proof.submitted",
	CHECKIN_SCHEDULED: "checkin.scheduled",
	CHECKIN_OUTCOME_LOGGED: "checkin.outcome.logged",
	CHECKIN_TIMELINE_VIEWED: "checkin.timeline.viewed",
	SCHEDULE_APPLIED: "schedule.applied",
	SCHEDULE_RECONCILED: "schedule.reconciled",
	NUDGE_SENT: "nudge.sent",
	NUDGE_FAILED: "nudge.failed",
	NUDGE_DISPATCH_COMPLETED: "nudge.dispatch.completed",
	FEATURE_REQUESTED: "feature.requested",
} as const;

export type TelemetryEvent = (typeof telemetryEvents)[keyof typeof telemetryEvents];

type EventPayload = Record<string, unknown>;

export function logTelemetryEvent(name: TelemetryEvent, payload: EventPayload) {
	// Minimal logger for now; can be replaced with analytics vendor later.
	console.info("[telemetry]", name, payload);
}
