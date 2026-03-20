import { logTelemetryEvent, telemetryEvents } from "@/lib/telemetry/events";

type ApiErrorContext = { route: string; requestId: string; userId?: string; error: unknown };

type UiErrorContext = { surface: string; requestId: string; error: unknown };

export function createRequestId() {
	return crypto.randomUUID();
}

export function toErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}
	return typeof error === "string" ? error : "Unknown error";
}

export function reportApiError(context: ApiErrorContext) {
	const message = toErrorMessage(context.error);
	console.error("[api-error]", { route: context.route, requestId: context.requestId, userId: context.userId ?? null, message, error: context.error });

	logTelemetryEvent(telemetryEvents.API_ERROR, { route: context.route, requestId: context.requestId, userId: context.userId ?? null, message });
}

export function reportUiError(context: UiErrorContext) {
	const message = toErrorMessage(context.error);
	console.error("[ui-error-boundary]", { surface: context.surface, requestId: context.requestId, message, error: context.error });

	logTelemetryEvent(telemetryEvents.UI_ERROR_BOUNDARY_TRIGGERED, { surface: context.surface, requestId: context.requestId, message });
}
