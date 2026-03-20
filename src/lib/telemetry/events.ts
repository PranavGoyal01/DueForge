export const telemetryEvents = {
	TASK_CREATED: "task.created",
	TASK_COMPLETED: "task.completed",
	COMMITMENT_CREATED: "commitment.created",
	PROOF_SUBMITTED: "proof.submitted",
	AUTH_REGISTERED: "auth.registered",
	AUTH_LOGIN_SUCCEEDED: "auth.login.succeeded",
	AUTH_LOGIN_FAILED: "auth.login.failed",
	AUTH_EMAIL_VERIFIED: "auth.email.verified",
	ACTIVATION_TASK_CREATED: "activation.task.created",
	ACTIVATION_COMMITMENT_CREATED: "activation.commitment.created",
	ACTIVATION_PROOF_SUBMITTED: "activation.proof.submitted",
	RETENTION_TASKS_VIEWED: "retention.tasks.viewed",
	RETENTION_COMMITMENTS_VIEWED: "retention.commitments.viewed",
	DRIFT_SCAN_COMPLETED: "drift_scan.completed",
	DRIFT_SCAN_FAILED: "drift_scan.failed",
	NUDGE_DISPATCH_FAILED: "nudge.dispatch.failed",
	API_ERROR: "api.error",
	UI_ERROR_BOUNDARY_TRIGGERED: "ui.error_boundary.triggered",
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
