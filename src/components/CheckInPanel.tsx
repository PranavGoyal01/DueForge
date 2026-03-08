"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";

type CheckInMode = "VIDEO" | "AUDIO" | "ASYNC_NOTE";

type CheckInItem = {
	id: string;
	scheduledAt: string;
	mode: CheckInMode;
	agenda: string | null;
};

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

const modeLabels: Record<CheckInMode, string> = {
	VIDEO: "Video",
	AUDIO: "Audio",
	ASYNC_NOTE: "Async Note",
};

export function CheckInPanel() {
	const [checkIns, setCheckIns] = useState<CheckInItem[]>([]);
	const [scheduledAt, setScheduledAt] = useState("");
	const [mode, setMode] = useState<CheckInMode>("VIDEO");
	const [agenda, setAgenda] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const sortedCheckIns = useMemo(() => [...checkIns].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()), [checkIns]);

	useEffect(() => {
		let isCancelled = false;

		const load = async () => {
			setIsLoading(true);
			const response = await fetch("/api/checkins");

			if (response.status === 401) {
				window.location.href = "/login";
				return;
			}

			if (!response.ok) {
				if (!isCancelled) {
					setMessage("Could not load check-ins.");
					setIsLoading(false);
				}
				return;
			}

			const body = (await response.json()) as { checkIns: CheckInItem[] };

			if (!isCancelled) {
				setCheckIns(body.checkIns ?? []);
				setIsLoading(false);
			}
		};

		void load();

		return () => {
			isCancelled = true;
		};
	}, []);

	const submit = async () => {
		if (!scheduledAt) {
			setMessage("Pick a date and time for the check-in.");
			return;
		}

		setIsSubmitting(true);
		setMessage(null);

		const response = await fetch("/api/checkins", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				scheduledAt: new Date(scheduledAt).toISOString(),
				mode,
				agenda: agenda.trim() || undefined,
			}),
		});

		if (response.status === 401) {
			window.location.href = "/login";
			return;
		}

		if (!response.ok) {
			setMessage("Could not schedule check-in.");
			setIsSubmitting(false);
			return;
		}

		const body = (await response.json()) as { checkIn: CheckInItem };
		setCheckIns((current) => [body.checkIn, ...current]);
		setScheduledAt("");
		setAgenda("");
		setIsSubmitting(false);
		setMessage("Check-in scheduled.");
	};

	return (
		<Card className='py-5'>
			<CardHeader>
				<CardTitle className='text-sm font-semibold uppercase tracking-wide'>Check-ins</CardTitle>
				<CardDescription>Schedule accountability check-ins for the next two weeks.</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid gap-3 sm:grid-cols-2'>
					<div className='space-y-1'>
						<label htmlFor='checkin-scheduled-at' className='text-xs text-muted-foreground'>
							Date & time
						</label>
						<Input id='checkin-scheduled-at' type='datetime-local' value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className='w-full' />
					</div>

					<div className='space-y-1'>
						<label className='text-xs text-muted-foreground'>Mode</label>
						<Select value={mode} onValueChange={(value) => setMode(value as CheckInMode)}>
							<SelectTrigger className='w-full'>
								<SelectValue placeholder='Select mode' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='VIDEO'>Video</SelectItem>
								<SelectItem value='AUDIO'>Audio</SelectItem>
								<SelectItem value='ASYNC_NOTE'>Async Note</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className='space-y-1'>
					<label htmlFor='checkin-agenda' className='text-xs text-muted-foreground'>
						Agenda (optional)
					</label>
					<Textarea id='checkin-agenda' value={agenda} onChange={(event) => setAgenda(event.target.value)} className='min-h-20 w-full' placeholder='Discuss blockers and next commitments' />
				</div>

				<div className='flex items-center gap-3'>
					<Button type='button' onClick={submit} disabled={isSubmitting}>
						{isSubmitting ? "Scheduling..." : "Schedule Check-in"}
					</Button>
					{message ? <p className='text-xs text-muted-foreground'>{message}</p> : null}
				</div>

				<div className='space-y-2 pt-1'>
					{isLoading ? <p className='text-xs text-muted-foreground'>Loading check-ins...</p> : null}
					{!isLoading && sortedCheckIns.length === 0 ? <p className='text-xs text-muted-foreground'>No upcoming check-ins in the next two weeks.</p> : null}
					{sortedCheckIns.map((item) => (
						<Card key={item.id} size='sm' className='border bg-card/60 py-3'>
							<CardContent className='space-y-1'>
								<div className='flex items-center justify-between gap-2'>
									<p className='text-sm'>{formatDate(item.scheduledAt)}</p>
									<Badge variant='outline'>{modeLabels[item.mode]}</Badge>
								</div>
								{item.agenda ? <p className='text-xs text-muted-foreground'>{item.agenda}</p> : null}
							</CardContent>
						</Card>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
