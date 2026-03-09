export type NudgeRisk = "urgent_overdue" | "due_soon" | "due_today" | "unscheduled";

export type NudgeTemplateContext = {
	taskTitle: string;
	dueAt: Date | null;
	appBaseUrl: string;
};

export type RenderedNudgeTemplate = {
	templateKey: string;
	risk: NudgeRisk;
	title: string;
	inAppBody: string;
	emailSubject: string;
	emailText: string;
	emailHtml: string;
};

function formatDate(value: Date | null) {
	if (!value) {
		return "No due date";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
}

function getRisk(dueAt: Date | null): NudgeRisk {
	if (!dueAt) {
		return "unscheduled";
	}

	const deltaMs = dueAt.getTime() - Date.now();
	if (deltaMs < 0) {
		return "urgent_overdue";
	}
	if (deltaMs <= 6 * 60 * 60 * 1000) {
		return "due_soon";
	}
	if (deltaMs <= 24 * 60 * 60 * 1000) {
		return "due_today";
	}

	return "due_soon";
}

function getTemplateKey(risk: NudgeRisk) {
	switch (risk) {
		case "urgent_overdue":
			return "nudge.commitment.urgent_overdue.v1";
		case "due_soon":
			return "nudge.commitment.due_soon.v1";
		case "due_today":
			return "nudge.commitment.due_today.v1";
		case "unscheduled":
		default:
			return "nudge.commitment.unscheduled.v1";
	}
}

function getTitle(risk: NudgeRisk) {
	switch (risk) {
		case "urgent_overdue":
			return "This commitment is overdue";
		case "due_soon":
			return "Commitment due soon";
		case "due_today":
			return "Commitment due today";
		case "unscheduled":
		default:
			return "Follow-through reminder";
	}
}

export function renderCommitmentNudgeTemplate(context: NudgeTemplateContext): RenderedNudgeTemplate {
	const risk = getRisk(context.dueAt);
	const dueLabel = formatDate(context.dueAt);
	const templateKey = getTemplateKey(risk);
	const title = getTitle(risk);
	const ctaUrl = `${context.appBaseUrl}/commitments`;

	const inAppBody = `${context.taskTitle} is still open. Due: ${dueLabel}. Add proof to close the loop.`;
	const emailSubject = `[DueForge] ${title}: ${context.taskTitle}`;
	const emailText = [`Task: ${context.taskTitle}`, `Due: ${dueLabel}`, "", "Add proof now to keep your accountability streak intact.", `Open commitments: ${ctaUrl}`].join("\n");
	const emailHtml = [`<p><strong>${title}</strong></p>`, `<p><strong>Task:</strong> ${context.taskTitle}</p>`, `<p><strong>Due:</strong> ${dueLabel}</p>`, "<p>Add proof now to keep your accountability streak intact.</p>", `<p><a href=\"${ctaUrl}\">Open commitments</a></p>`].join("");

	return {
		templateKey,
		risk,
		title,
		inAppBody,
		emailSubject,
		emailText,
		emailHtml,
	};
}
