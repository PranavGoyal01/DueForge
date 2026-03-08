"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";

type PlannerTask = {
	id: string;
	title: string;
	dueAt: string | null;
	estimatedMinutes: number | null;
};

type Suggestion = {
	taskId: string;
	title: string;
	startAt: string;
	endAt: string;
	reason: string;
};

type SchedulePlannerProps = {
	tasks: PlannerTask[];
};

type CalendarItem = {
	id: string;
	summary: string;
	primary: boolean;
	accessRole: string;
	isDedicatedDueForge: boolean;
};

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

export function SchedulePlanner({ tasks }: SchedulePlannerProps) {
	const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [isSuggesting, setIsSuggesting] = useState(false);
	const [isApplying, setIsApplying] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [calendars, setCalendars] = useState<CalendarItem[]>([]);
	const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);

	useEffect(() => {
		let isCancelled = false;

		const run = async () => {
			const response = await fetch("/api/integrations/google/calendars");
			if (response.status === 401) {
				window.location.href = "/login";
				return;
			}

			if (!response.ok) {
				if (!isCancelled) {
					setMessage("Could not load calendars. Suggestions will use default behavior.");
				}
				return;
			}

			const body = (await response.json()) as { calendars: CalendarItem[]; connected: boolean };
			const items = body.calendars ?? [];
			if (!isCancelled) {
				setCalendars(items);
				setSelectedCalendarIds(items.map((item) => item.id));
			}
		};

		void run();

		return () => {
			isCancelled = true;
		};
	}, []);

	const selectedTaskCount = useMemo(() => selectedTaskIds.length, [selectedTaskIds]);

	const toggleTask = (taskId: string) => {
		setSelectedTaskIds((current) => (current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]));
	};

	const toggleCalendar = (calendarId: string) => {
		setSelectedCalendarIds((current) => (current.includes(calendarId) ? current.filter((id) => id !== calendarId) : [...current, calendarId]));
	};

	const moveCalendar = (calendarId: string, direction: "up" | "down") => {
		setSelectedCalendarIds((current) => {
			const index = current.indexOf(calendarId);
			if (index === -1) {
				return current;
			}

			const target = direction === "up" ? index - 1 : index + 1;
			if (target < 0 || target >= current.length) {
				return current;
			}

			const next = [...current];
			[next[index], next[target]] = [next[target], next[index]];
			return next;
		});
	};

	const suggestSchedule = async () => {
		if (selectedTaskIds.length === 0) {
			setMessage("Select at least one task to generate schedule blocks.");
			return;
		}

		setIsSuggesting(true);
		setMessage(null);

		const response = await fetch("/api/schedule/suggest", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ taskIds: selectedTaskIds, calendarIds: selectedCalendarIds }),
		});

		if (response.status === 401) {
			window.location.href = "/login";
			return;
		}

		if (!response.ok) {
			setMessage("Could not generate schedule suggestions.");
			setIsSuggesting(false);
			return;
		}

		const body = (await response.json()) as { suggestions: Suggestion[] };
		setSuggestions(body.suggestions ?? []);
		setMessage("Schedule suggestions generated.");
		setIsSuggesting(false);
	};

	const applySchedule = async () => {
		if (suggestions.length === 0) {
			setMessage("Generate schedule suggestions first.");
			return;
		}

		setIsApplying(true);
		setMessage(null);

		const response = await fetch("/api/schedule/apply", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				blocks: suggestions.map((item) => ({
					taskId: item.taskId,
					startAt: item.startAt,
					endAt: item.endAt,
				})),
			}),
		});

		if (response.status === 401) {
			window.location.href = "/login";
			return;
		}

		if (!response.ok) {
			setMessage("Could not apply schedule to dedicated DueForge calendar.");
			setIsApplying(false);
			return;
		}

		setMessage("Schedule applied to dedicated DueForge calendar.");
		setIsApplying(false);
		setSuggestions([]);
		setSelectedTaskIds([]);
	};

	if (tasks.length === 0) {
		return null;
	}

	return (
		<Card className='mt-6 py-5'>
			<CardHeader>
				<CardTitle className='text-sm font-semibold uppercase tracking-wide'>Scheduler</CardTitle>
				<CardDescription>Select tasks to time-block into dedicated DueForge calendar.</CardDescription>
			</CardHeader>

			<CardContent className='grid gap-2 md:grid-cols-2'>
				{tasks.map((task) => (
					<label key={task.id} className='rounded-lg border border-border bg-card/60 px-3 py-2'>
						<div className='flex items-center gap-3'>
							<input type='checkbox' checked={selectedTaskIds.includes(task.id)} onChange={() => toggleTask(task.id)} className='h-4 w-4' />
							<div className='min-w-0 flex-1'>
								<p className='truncate text-sm'>{task.title}</p>
								<p className='text-xs text-muted-foreground'>
									{task.estimatedMinutes ? `${task.estimatedMinutes}m` : "45m default"}
									{task.dueAt ? ` • Due ${formatDate(task.dueAt)}` : ""}
								</p>
							</div>
						</div>
					</label>
				))}
			</CardContent>

			{calendars.length > 0 ? (
				<Card className='mt-4 py-3'>
					<CardContent>
						<p className='text-xs uppercase tracking-wide text-muted-foreground'>Calendar Constraints (toggle + priority order)</p>
						<div className='mt-2 space-y-2'>
							{selectedCalendarIds
								.map((id) => calendars.find((calendar) => calendar.id === id))
								.filter((item): item is CalendarItem => Boolean(item))
								.map((calendar, index) => (
									<div key={calendar.id} className='flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2 py-1.5'>
										<input type='checkbox' checked={selectedCalendarIds.includes(calendar.id)} onChange={() => toggleCalendar(calendar.id)} className='h-4 w-4' aria-label={`Include ${calendar.summary} in scheduling constraints`} />
										<p className='flex-1 truncate text-xs'>
											{index + 1}. {calendar.summary}
											{calendar.isDedicatedDueForge ? " (DueForge)" : ""}
											{calendar.primary ? " (Primary)" : ""}
										</p>
										<Button type='button' variant='outline' size='xs' onClick={() => moveCalendar(calendar.id, "up")}>
											↑
										</Button>
										<Button type='button' variant='outline' size='xs' onClick={() => moveCalendar(calendar.id, "down")}>
											↓
										</Button>
									</div>
								))}

							{calendars
								.filter((calendar) => !selectedCalendarIds.includes(calendar.id))
								.map((calendar) => (
									<div key={calendar.id} className='flex items-center gap-2 rounded-lg border border-border bg-card/40 px-2 py-1.5 opacity-70'>
										<input type='checkbox' checked={false} onChange={() => toggleCalendar(calendar.id)} className='h-4 w-4' aria-label={`Include ${calendar.summary} in scheduling constraints`} />
										<p className='flex-1 truncate text-xs text-muted-foreground'>{calendar.summary}</p>
									</div>
								))}
						</div>
					</CardContent>
				</Card>
			) : null}

			<div className='mt-4 flex items-center gap-2'>
				<Button type='button' onClick={suggestSchedule} disabled={isSuggesting || selectedTaskCount === 0} size='sm'>
					{isSuggesting ? "Generating..." : `Suggest Schedule (${selectedTaskCount})`}
				</Button>

				<Button type='button' onClick={applySchedule} disabled={isApplying || suggestions.length === 0} variant='outline' size='sm'>
					{isApplying ? "Applying..." : `Apply to Calendar (${suggestions.length})`}
				</Button>
			</div>

			{message ? <p className='mt-3 px-4 text-xs text-muted-foreground'>{message}</p> : null}

			{suggestions.length > 0 ? (
				<div className='mt-4 space-y-2'>
					{suggestions.map((item) => (
						<Card key={`${item.taskId}-${item.startAt}`} size='sm' className='border bg-card/60 py-3'>
							<CardContent>
								<div className='flex items-center justify-between gap-2'>
									<p className='text-sm'>{item.title}</p>
									<Badge variant='outline'>Suggested</Badge>
								</div>
								<p className='text-xs text-muted-foreground'>
									{formatDate(item.startAt)} {"->"} {formatDate(item.endAt)}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			) : null}
		</Card>
	);
}
