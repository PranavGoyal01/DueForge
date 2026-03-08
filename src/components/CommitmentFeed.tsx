"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState, useTransition } from "react";

type ProofTypeValue = "TEXT" | "LINK";
type CommitmentScope = "today" | "week" | "at_risk";

type CommitmentItem = {
	id: string;
	task: {
		title: string;
	};
	dueAt: string | null;
	status: string;
	proofs: { id: string }[];
};

type CommitmentFeedProps = {
	initialCommitments: CommitmentItem[];
};

function formatDate(value: string | null) {
	if (!value) {
		return "No deadline";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

export function CommitmentFeed({ initialCommitments }: CommitmentFeedProps) {
	const [commitments, setCommitments] = useState<CommitmentItem[]>(initialCommitments);
	const [draftByCommitmentId, setDraftByCommitmentId] = useState<Record<string, string>>({});
	const [proofTypeByCommitmentId, setProofTypeByCommitmentId] = useState<Record<string, ProofTypeValue>>({});
	const [completeByCommitmentId, setCompleteByCommitmentId] = useState<Record<string, boolean>>({});
	const [activeScope, setActiveScope] = useState<CommitmentScope>("week");
	const [isLoadingScope, setIsLoadingScope] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const hasItems = useMemo(() => commitments.length > 0, [commitments.length]);

	const loadScope = async (scope: CommitmentScope) => {
		setActiveScope(scope);
		setIsLoadingScope(true);

		try {
			const response = await fetch(`/api/commitments?scope=${scope}`);

			if (response.status === 401) {
				window.location.href = "/login";
				return;
			}

			if (!response.ok) {
				setMessage("Could not load commitments for this view.");
				return;
			}

			const body = (await response.json()) as { commitments: CommitmentItem[] };
			setCommitments(body.commitments ?? []);
		} catch {
			setMessage("Could not load commitments for this view.");
		} finally {
			setIsLoadingScope(false);
		}
	};

	const submitProof = (commitmentId: string) => {
		const content = draftByCommitmentId[commitmentId]?.trim() ?? "";
		const type = proofTypeByCommitmentId[commitmentId] ?? "TEXT";
		const markCompleted = completeByCommitmentId[commitmentId] ?? false;

		if (!content) {
			setMessage("Add proof content before submitting.");
			return;
		}

		startTransition(async () => {
			setMessage(null);

			const response = await fetch(`/api/commitments/${commitmentId}/proof`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ type, content, markCompleted }),
			});

			if (response.status === 401) {
				window.location.href = "/login";
				return;
			}

			if (!response.ok) {
				setMessage("Could not submit proof.");
				return;
			}

			setCommitments((current) =>
				current.map((item) => {
					if (item.id !== commitmentId) {
						return item;
					}

					return {
						...item,
						status: markCompleted ? "COMPLETED" : item.status,
						proofs: [...item.proofs, { id: `local-${Date.now()}` }],
					};
				}),
			);

			setDraftByCommitmentId((current) => ({ ...current, [commitmentId]: "" }));
			setCompleteByCommitmentId((current) => ({ ...current, [commitmentId]: false }));
			setMessage(markCompleted ? "Proof submitted and commitment completed." : "Proof submitted.");

			if (activeScope !== "week") {
				void loadScope(activeScope);
			}
		});
	};

	return (
		<Card className='py-5'>
			<CardHeader>
				<div className='flex items-center justify-between gap-3'>
					<div>
						<CardTitle className='text-sm font-semibold uppercase tracking-wide'>Commitment Feed</CardTitle>
						<CardDescription>Track proofs and close the loop on commitments.</CardDescription>
					</div>
					<div className='flex items-center gap-2'>
						{(
							[
								{ id: "today", label: "Today" },
								{ id: "week", label: "Week" },
								{ id: "at_risk", label: "At Risk" },
							] as Array<{ id: CommitmentScope; label: string }>
						).map((scope) => (
							<Button key={scope.id} type='button' onClick={() => void loadScope(scope.id)} disabled={isLoadingScope} variant={activeScope === scope.id ? "default" : "outline"} size='xs'>
								{scope.label}
							</Button>
						))}
					</div>
				</div>
			</CardHeader>
			<CardContent className='space-y-3'>
				{isLoadingScope ? <p className='text-xs text-muted-foreground'>Loading commitments...</p> : null}
				{!hasItems ? (
					<p className='text-sm text-muted-foreground'>No commitments yet. Commit to a task to start accountability tracking.</p>
				) : (
					commitments.map((commitment) => (
						<Card key={commitment.id} className='py-3'>
							<CardContent>
								<p className='text-sm font-medium'>{commitment.task.title}</p>
								<p className='mt-1 text-xs text-muted-foreground'>
									Due {formatDate(commitment.dueAt)} • Proofs: {commitment.proofs.length} • {commitment.status}
								</p>
								<div className='mt-3 grid gap-2 sm:grid-cols-[140px_1fr]'>
									<Select
										value={proofTypeByCommitmentId[commitment.id] ?? "TEXT"}
										onValueChange={(value) =>
											setProofTypeByCommitmentId((current) => ({
												...current,
												[commitment.id]: value as ProofTypeValue,
											}))
										}
									>
										<SelectTrigger className='w-full'>
											<SelectValue placeholder='Proof type' />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='TEXT'>Text</SelectItem>
											<SelectItem value='LINK'>Link</SelectItem>
										</SelectContent>
									</Select>
									<Input
										value={draftByCommitmentId[commitment.id] ?? ""}
										onChange={(event) =>
											setDraftByCommitmentId((current) => ({
												...current,
												[commitment.id]: event.target.value,
											}))
										}
										placeholder='Add proof details or URL'
										className='text-xs'
									/>
								</div>

								<div className='mt-2 flex items-center justify-between gap-3'>
									<label className='flex items-center gap-2 text-xs text-muted-foreground'>
										<input
											type='checkbox'
											checked={completeByCommitmentId[commitment.id] ?? false}
											onChange={(event) =>
												setCompleteByCommitmentId((current) => ({
													...current,
													[commitment.id]: event.target.checked,
												}))
											}
											className='h-4 w-4'
										/>
										Mark completed
									</label>
									<Button type='button' size='sm' disabled={isPending} onClick={() => submitProof(commitment.id)}>
										{isPending ? "Submitting..." : "Submit Proof"}
									</Button>
								</div>
							</CardContent>
						</Card>
					))
				)}
			</CardContent>
			{message ? <p className='mt-3 px-4 text-xs text-muted-foreground'>{message}</p> : null}
		</Card>
	);
}
