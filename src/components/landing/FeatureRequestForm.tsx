"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";

type FeatureRequestPayload = {
	title: string;
	problem: string;
	impact: string;
	name?: string;
	email?: string;
	source: "demo";
};

export function FeatureRequestForm() {
	const [title, setTitle] = useState("");
	const [problem, setProblem] = useState("");
	const [impact, setImpact] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [requestId, setRequestId] = useState<string | null>(null);

	async function submit() {
		setIsSubmitting(true);
		setMessage(null);
		setRequestId(null);

		const payload: FeatureRequestPayload = {
			title,
			problem,
			impact,
			name: name.trim() || undefined,
			email: email.trim() || undefined,
			source: "demo",
		};

		track("feature_request_submit_attempt", {
			source: "demo",
			hasEmail: Boolean(payload.email),
		});

		const response = await fetch("/api/feature-requests", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as { error?: string } | null;
			setMessage(body?.error ?? "Could not submit your request right now.");
			setIsSubmitting(false);
			track("feature_request_submit_failed", { source: "demo" });
			return;
		}

		const body = (await response.json()) as { ok: true; requestId: string };
		setMessage("Feature request received. Thank you for shaping DueForge.");
		setRequestId(body.requestId);
		setTitle("");
		setProblem("");
		setImpact("");
		setName("");
		setEmail("");
		setIsSubmitting(false);
		track("feature_request_submit_success", { source: "demo" });
	}

	return (
		<section className='df-panel mt-8 p-5'>
			<div className='mb-4'>
				<p className='text-xs uppercase tracking-[0.2em] text-amber-300/85'>Request A Feature</p>
				<p className='mt-2 text-sm df-subtle'>Tell us what would most improve your follow-through. We read every request.</p>
			</div>

			<div className='grid gap-3'>
				<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder='Feature title (example: Slack accountability nudges)' className='df-input w-full px-3 py-2 text-sm' />
				<textarea value={problem} onChange={(event) => setProblem(event.target.value)} placeholder='What execution problem are you facing today?' className='df-input min-h-24 w-full px-3 py-2 text-sm' />
				<textarea value={impact} onChange={(event) => setImpact(event.target.value)} placeholder='How would this help you follow through?' className='df-input min-h-24 w-full px-3 py-2 text-sm' />
				<div className='grid gap-3 md:grid-cols-2'>
					<input value={name} onChange={(event) => setName(event.target.value)} placeholder='Name (optional)' className='df-input w-full px-3 py-2 text-sm' />
					<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder='Email (optional)' className='df-input w-full px-3 py-2 text-sm' />
				</div>
				<button type='button' onClick={submit} disabled={isSubmitting || title.trim().length < 5 || problem.trim().length < 10 || impact.trim().length < 10} className='df-btn-primary w-full px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60'>
					{isSubmitting ? "Submitting..." : "Send Feature Request"}
				</button>
				{message ? <p className='text-xs df-subtle'>{message}</p> : null}
				{requestId ? <p className='text-[11px] df-subtle'>Reference: {requestId}</p> : null}
			</div>
		</section>
	);
}
