"use client";

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
		<section className='df-panel p-5'>
			<h2 className='text-sm font-semibold uppercase tracking-wide df-muted'>Check-ins</h2>
			<p className='mt-2 text-sm df-subtle'>Schedule accountability check-ins for the next two weeks.</p>

			<div className='mt-4 grid gap-3 sm:grid-cols-2'>
				<label className='text-xs df-subtle'>
					Date & time
					<input type='datetime-local' value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className='df-input mt-1 w-full px-3 py-2 text-sm' />
				</label>

				<label className='text-xs df-subtle'>
					Mode
					<select value={mode} onChange={(event) => setMode(event.target.value as CheckInMode)} className='df-input mt-1 w-full px-3 py-2 text-sm'>
						<option value='VIDEO'>Video</option>
						<option value='AUDIO'>Audio</option>
						<option value='ASYNC_NOTE'>Async Note</option>
					</select>
				</label>
			</div>

			<label className='mt-3 block text-xs df-subtle'>
				Agenda (optional)
				<textarea value={agenda} onChange={(event) => setAgenda(event.target.value)} className='df-input mt-1 min-h-20 w-full px-3 py-2 text-sm' placeholder='Discuss blockers and next commitments' />
			</label>

			<div className='mt-3'>
				<button type='button' onClick={submit} disabled={isSubmitting} className='df-btn-primary px-3 py-2 text-xs disabled:opacity-60'>
					{isSubmitting ? "Scheduling..." : "Schedule Check-in"}
				</button>
			</div>

			{message ? <p className='mt-3 text-xs df-subtle'>{message}</p> : null}

			<div className='mt-4 space-y-2'>
				{isLoading ? <p className='text-xs df-subtle'>Loading check-ins...</p> : null}
				{!isLoading && sortedCheckIns.length === 0 ? <p className='text-xs df-subtle'>No upcoming check-ins in the next two weeks.</p> : null}
				{sortedCheckIns.map((item) => (
					<article key={item.id} className='df-card px-3 py-2'>
						<p className='text-sm text-white'>{formatDate(item.scheduledAt)}</p>
						<p className='text-xs df-subtle'>{modeLabels[item.mode]}</p>
						{item.agenda ? <p className='mt-1 text-xs df-subtle'>{item.agenda}</p> : null}
					</article>
				))}
			</div>
		</section>
	);
}
