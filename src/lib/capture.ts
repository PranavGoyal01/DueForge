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

type ParsedTime = {
	hour: number;
	minute: number;
};

function withTime(value: Date, time: ParsedTime) {
	const next = new Date(value);
	next.setHours(time.hour, time.minute, 0, 0);
	return next;
}

function parseTime(input: string): ParsedTime | undefined {
	const lowered = input.toLowerCase();

	if (/\b(noon)\b/.test(lowered)) {
		return { hour: 12, minute: 0 };
	}

	if (/\b(midnight)\b/.test(lowered)) {
		return { hour: 23, minute: 59 };
	}

	if (/\b(eod|end of day)\b/.test(lowered)) {
		return { hour: 18, minute: 0 };
	}

	const meridiem = lowered.match(/\b(?:at|by)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
	if (meridiem) {
		const rawHour = Number(meridiem[1]);
		const minute = Number(meridiem[2] ?? "0");
		const suffix = meridiem[3].toLowerCase();
		let hour = rawHour % 12;
		if (suffix === "pm") {
			hour += 12;
		}
		return { hour, minute };
	}

	const twentyFourHour = lowered.match(/\b(?:at|by)?\s*(\d{1,2}):(\d{2})\b/);
	if (twentyFourHour) {
		const hour = Number(twentyFourHour[1]);
		const minute = Number(twentyFourHour[2]);
		if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
			return { hour, minute };
		}
	}

	return undefined;
}

function dayIndex(dayName: string) {
	const map: Record<string, number> = {
		sunday: 0,
		monday: 1,
		tuesday: 2,
		wednesday: 3,
		thursday: 4,
		friday: 5,
		saturday: 6,
	};

	return map[dayName.toLowerCase()];
}

function parseDueDate(input: string): string | undefined {
	const lowered = input.toLowerCase();
	const now = new Date();
	const parsedTime = parseTime(input);
	const fallbackTime = parsedTime ?? { hour: 18, minute: 0 };

	if (/\b(today|tonight)\b/.test(lowered)) {
		return withTime(now, parsedTime ?? { hour: 22, minute: 0 }).toISOString();
	}

	if (/\b(tomorrow)\b/.test(lowered)) {
		const next = new Date(now);
		next.setDate(next.getDate() + 1);
		return withTime(next, fallbackTime).toISOString();
	}

	if (/\bnext week\b/.test(lowered)) {
		const next = new Date(now);
		next.setDate(next.getDate() + 7);
		return withTime(next, parsedTime ?? { hour: 12, minute: 0 }).toISOString();
	}

	const inRelative = lowered.match(/\bin\s+(\d{1,2})\s*(day|days|week|weeks)\b/);
	if (inRelative) {
		const amount = Number(inRelative[1]);
		const unit = inRelative[2];
		const next = new Date(now);
		if (unit.startsWith("week")) {
			next.setDate(next.getDate() + amount * 7);
		} else {
			next.setDate(next.getDate() + amount);
		}
		return withTime(next, fallbackTime).toISOString();
	}

	const weekdayMatch = lowered.match(/\b(?:on\s+)?(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
	if (weekdayMatch) {
		const forceNextWeek = Boolean(weekdayMatch[1]);
		const weekday = dayIndex(weekdayMatch[2]);
		if (weekday !== undefined) {
			const next = new Date(now);
			const delta = (weekday - next.getDay() + 7) % 7;
			const offset = forceNextWeek || delta === 0 ? delta + 7 : delta;
			next.setDate(next.getDate() + offset);
			return withTime(next, fallbackTime).toISOString();
		}
	}

	const byIsoDateMatch = input.match(/\bby\s+(\d{4}-\d{2}-\d{2})\b/i);
	if (byIsoDateMatch?.[1]) {
		const date = new Date(`${byIsoDateMatch[1]}T00:00:00`);
		return withTime(date, fallbackTime).toISOString();
	}

	const slashDateMatch = input.match(/\b(?:by|on)?\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/i);
	if (slashDateMatch) {
		const month = Number(slashDateMatch[1]) - 1;
		const day = Number(slashDateMatch[2]);
		const year = slashDateMatch[3] ? Number(slashDateMatch[3]) : now.getFullYear();
		const date = new Date(year, month, day);
		if (!slashDateMatch[3] && date.getTime() < now.getTime()) {
			date.setFullYear(year + 1);
		}
		return withTime(date, fallbackTime).toISOString();
	}

	const monthNameDateMatch = input.match(/\b(?:by|on)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,?\s*(\d{4}))?\b/i);
	if (monthNameDateMatch) {
		const monthName = monthNameDateMatch[1].toLowerCase();
		const months: Record<string, number> = {
			january: 0,
			jan: 0,
			february: 1,
			feb: 1,
			march: 2,
			mar: 2,
			april: 3,
			apr: 3,
			may: 4,
			june: 5,
			jun: 5,
			july: 6,
			jul: 6,
			august: 7,
			aug: 7,
			september: 8,
			sept: 8,
			sep: 8,
			october: 9,
			oct: 9,
			november: 10,
			nov: 10,
			december: 11,
			dec: 11,
		};
		const monthIndex = months[monthName];
		if (monthIndex !== undefined) {
			const day = Number(monthNameDateMatch[2]);
			const year = monthNameDateMatch[3] ? Number(monthNameDateMatch[3]) : now.getFullYear();
			const date = new Date(year, monthIndex, day);
			if (!monthNameDateMatch[3] && date.getTime() < now.getTime()) {
				date.setFullYear(year + 1);
			}
			return withTime(date, fallbackTime).toISOString();
		}
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
	const minuteMatch = input.match(/(\d{1,3})\s*(m|min|mins|minute|minutes)\b/i);
	if (minuteMatch) {
		return Number(minuteMatch[1]);
	}

	const hourMatch = input.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(h|hr|hrs|hour|hours)\b/i);
	if (hourMatch) {
		return Math.round(Number(hourMatch[1]) * 60);
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
