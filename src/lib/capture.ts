export type ParsedTaskDraft = {
	title: string;
	details?: string;
	dueAt?: string;
	priority: number;
	estimatedMinutes?: number;
	tags: string[];
};

function normalizeTitle(input: string) {
	return input
		.replace(/\s+/g, " ")
		.replace(/^(todo|task|remember to)\s*[:\-]?\s*/i, "")
		.trim();
}

function parseDueDate(input: string): string | undefined {
	const lowered = input.toLowerCase();
	const now = new Date();

	if (/(today|tonight)/.test(lowered)) {
		return new Date(now.setHours(22, 0, 0, 0)).toISOString();
	}

	if (/(tomorrow)/.test(lowered)) {
		now.setDate(now.getDate() + 1);
		return new Date(now.setHours(18, 0, 0, 0)).toISOString();
	}

	if (/next week/.test(lowered)) {
		now.setDate(now.getDate() + 7);
		return new Date(now.setHours(12, 0, 0, 0)).toISOString();
	}

	const byDateMatch = input.match(/\bby\s+(\d{4}-\d{2}-\d{2})\b/i);
	if (byDateMatch?.[1]) {
		return new Date(`${byDateMatch[1]}T18:00:00.000Z`).toISOString();
	}

	return undefined;
}

function parsePriority(input: string) {
	const lowered = input.toLowerCase();

	if (/\b(urgent|asap|critical|high priority)\b/.test(lowered)) {
		return 1;
	}

	if (/\b(low priority|later|someday)\b/.test(lowered)) {
		return 3;
	}

	return 2;
}

function parseEstimate(input: string): number | undefined {
	const minuteMatch = input.match(/(\d{1,3})\s*(min|mins|minutes)\b/i);
	if (minuteMatch) {
		return Number(minuteMatch[1]);
	}

	const hourMatch = input.match(/(\d{1,2})\s*(h|hr|hrs|hour|hours)\b/i);
	if (hourMatch) {
		return Number(hourMatch[1]) * 60;
	}

	return undefined;
}

function parseTags(input: string): string[] {
	const fromHash = [...input.matchAll(/#([a-zA-Z0-9_-]+)/g)].map((m) => m[1].toLowerCase());
	return Array.from(new Set(fromHash));
}

export function parseQuickCapture(input: string): ParsedTaskDraft {
	const trimmed = input.trim();
	const title = normalizeTitle(trimmed.split(/[\n\.!]/)[0] || trimmed).slice(0, 140) || "New task";

	return {
		title,
		details: trimmed.length > title.length ? trimmed : undefined,
		dueAt: parseDueDate(trimmed),
		priority: parsePriority(trimmed),
		estimatedMinutes: parseEstimate(trimmed),
		tags: parseTags(trimmed),
	};
}
