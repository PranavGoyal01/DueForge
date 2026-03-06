"use client";

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
		<section className='df-panel p-5'>
			<div className='flex items-center justify-between gap-3'>
				<h2 className='text-sm font-semibold uppercase tracking-wide df-muted'>Commitment Feed</h2>
				<div className='flex items-center gap-2'>
					{(
						[
							{ id: "today", label: "Today" },
							{ id: "week", label: "Week" },
							{ id: "at_risk", label: "At Risk" },
						] as Array<{ id: CommitmentScope; label: string }>
					).map((scope) => (
						<button key={scope.id} type='button' onClick={() => void loadScope(scope.id)} disabled={isLoadingScope} className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${activeScope === scope.id ? "border-[var(--accent)] bg-[var(--accent)] text-[#111111]" : "df-btn-secondary"}`}>
							{scope.label}
						</button>
					))}
				</div>
			</div>
			<div className='mt-4 space-y-3'>
				{isLoadingScope ? <p className='text-xs df-subtle'>Loading commitments...</p> : null}
				{!hasItems ? (
					<p className='text-sm df-subtle'>No commitments yet. Commit to a task to start accountability tracking.</p>
				) : (
					commitments.map((commitment) => (
						<article key={commitment.id} className='df-card p-3'>
							<p className='text-sm font-medium text-white'>{commitment.task.title}</p>
							<p className='mt-1 text-xs df-subtle'>
								Due {formatDate(commitment.dueAt)} • Proofs: {commitment.proofs.length} • {commitment.status}
							</p>

							<div className='mt-3 grid gap-2 sm:grid-cols-[120px_1fr]'>
								<select
									value={proofTypeByCommitmentId[commitment.id] ?? "TEXT"}
									onChange={(event) =>
										setProofTypeByCommitmentId((current) => ({
											...current,
											[commitment.id]: event.target.value as ProofTypeValue,
										}))
									}
									className='df-input px-2 py-2 text-xs'
								>
									<option value='TEXT'>Text</option>
									<option value='LINK'>Link</option>
								</select>
								<input
									value={draftByCommitmentId[commitment.id] ?? ""}
									onChange={(event) =>
										setDraftByCommitmentId((current) => ({
											...current,
											[commitment.id]: event.target.value,
										}))
									}
									placeholder='Add proof details or URL'
									className='df-input px-3 py-2 text-xs'
								/>
							</div>

							<div className='mt-2 flex items-center justify-between gap-3'>
								<label className='flex items-center gap-2 text-xs df-subtle'>
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
								<button type='button' disabled={isPending} onClick={() => submitProof(commitment.id)} className='df-btn-primary px-3 py-1.5 text-xs disabled:opacity-60'>
									{isPending ? "Submitting..." : "Submit Proof"}
								</button>
							</div>
						</article>
					))
				)}
			</div>

			{message ? <p className='mt-3 text-xs df-subtle'>{message}</p> : null}
		</section>
	);
}
