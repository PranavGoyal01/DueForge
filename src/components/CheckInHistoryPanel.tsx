"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

type CheckInMode = "VIDEO" | "AUDIO" | "ASYNC_NOTE";

type PastCheckInItem = {
	id: string;
	scheduledAt: string;
	mode: CheckInMode;
	agenda: string | null;
	outcome: string | null;
	nextCommitments: string | null;
};

type CheckInHistoryPanelProps = {
	initialItems: PastCheckInItem[];
};

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

export function CheckInHistoryPanel({ initialItems }: CheckInHistoryPanelProps) {
	const [items, setItems] = useState<PastCheckInItem[]>(initialItems);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draftOutcome, setDraftOutcome] = useState("");
	const [draftNextCommitments, setDraftNextCommitments] = useState("");
	const [savingId, setSavingId] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const startEditing = (item: PastCheckInItem) => {
		setEditingId(item.id);
		setDraftOutcome(item.outcome ?? "");
		setDraftNextCommitments(item.nextCommitments ?? "");
		setMessage(null);
	};

	const cancelEditing = () => {
		setEditingId(null);
		setDraftOutcome("");
		setDraftNextCommitments("");
		setMessage(null);
	};

	const save = async (itemId: string) => {
		const trimmedOutcome = draftOutcome.trim();
		if (!trimmedOutcome) {
			setMessage("Outcome is required before saving.");
			return;
		}

		setSavingId(itemId);
		setMessage(null);

		const response = await fetch(`/api/checkins/${itemId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				outcome: trimmedOutcome,
				nextCommitments: draftNextCommitments.trim() || undefined,
			}),
		});

		if (response.status === 401) {
			window.location.assign("/login");
			return;
		}

		if (!response.ok) {
			setMessage("Could not save outcome. Try again.");
			setSavingId(null);
			return;
		}

		const body = (await response.json()) as { checkIn: PastCheckInItem };
		setItems((current) => current.map((entry) => (entry.id === itemId ? { ...entry, ...body.checkIn } : entry)));
		setSavingId(null);
		setEditingId(null);
		setDraftOutcome("");
		setDraftNextCommitments("");
		setMessage("Outcome saved.");
	};

	return (
		<Card className='py-5'>
			<CardHeader>
				<CardTitle className='text-sm uppercase tracking-wide'>Past Check-In History</CardTitle>
				<CardDescription>Latest 20 sessions. Log outcomes and next commitments to close each loop.</CardDescription>
			</CardHeader>
			<CardContent className='space-y-2'>
				{items.length === 0 ? (
					<p className='text-xs text-muted-foreground'>No past check-ins yet. Your history will appear after the first completed session.</p>
				) : (
					items.map((item) => {
						const hasOutcome = Boolean(item.outcome && item.outcome.trim().length > 0);
						const isEditing = editingId === item.id;
						const isSaving = savingId === item.id;

						return (
							<Card key={item.id} size='sm' className='border bg-card/60 py-3'>
								<CardContent className='space-y-2'>
									<div className='flex items-start justify-between gap-3'>
										<div>
											<p className='text-sm'>{formatDate(item.scheduledAt)}</p>
											<p className='mt-1 text-xs text-muted-foreground'>{item.mode.replace("_", " ")}</p>
											{item.agenda ? <p className='mt-1 text-xs text-muted-foreground'>Agenda: {item.agenda}</p> : null}
										</div>
										<Badge variant={hasOutcome ? "secondary" : "outline"}>{hasOutcome ? "Outcome Logged" : "No Outcome Logged"}</Badge>
									</div>

									{!isEditing ? (
										<>
											{hasOutcome ? <p className='text-xs text-foreground/90'>Outcome: {item.outcome}</p> : <p className='text-xs text-amber-200/90'>No recorded outcome. This check-in did not close the loop.</p>}
											{item.nextCommitments ? <p className='text-xs text-muted-foreground'>Next commitments: {item.nextCommitments}</p> : null}
											<div>
												<Button type='button' variant='ghost' size='sm' onClick={() => startEditing(item)}>
													{hasOutcome ? "Edit Outcome" : "Add Outcome"}
												</Button>
											</div>
										</>
									) : (
										<div className='space-y-2'>
											<div className='space-y-1'>
												<label htmlFor={`outcome-${item.id}`} className='text-xs text-muted-foreground'>
													Outcome
												</label>
												<Textarea
													id={`outcome-${item.id}`}
													value={draftOutcome}
													onChange={(event) => setDraftOutcome(event.target.value)}
													className='min-h-20'
													placeholder='What happened in the check-in?'
												/>
											</div>
											<div className='space-y-1'>
												<label htmlFor={`next-commitments-${item.id}`} className='text-xs text-muted-foreground'>
													Next commitments (optional)
												</label>
												<Textarea
													id={`next-commitments-${item.id}`}
													value={draftNextCommitments}
													onChange={(event) => setDraftNextCommitments(event.target.value)}
													className='min-h-16'
													placeholder='List specific follow-up actions before the next session.'
												/>
											</div>
											<div className='flex items-center gap-2'>
												<Button type='button' size='sm' onClick={() => save(item.id)} disabled={isSaving}>
													{isSaving ? "Saving..." : "Save"}
												</Button>
												<Button type='button' size='sm' variant='outline' onClick={cancelEditing} disabled={isSaving}>
													Cancel
												</Button>
											</div>
										</div>
									)}
								</CardContent>
							</Card>
						);
					})
				)}
				{message ? <p className='text-xs text-muted-foreground'>{message}</p> : null}
			</CardContent>
		</Card>
	);
}
