"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState, useTransition } from "react";

type DraftResponse = {
	draft: {
		title: string;
		details?: string;
		dueAt?: string;
		priority: number;
		estimatedMinutes?: number;
		tags: string[];
	};
};

export function QuickCaptureForm() {
	const [input, setInput] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const submit = () => {
		if (!input.trim()) {
			setMessage("Add a commitment first.");
			return;
		}

		startTransition(async () => {
			setMessage("Parsing commitment...");

			const parsedResponse = await fetch("/api/capture/parse", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ input }),
			});

			if (parsedResponse.status === 401) {
				window.location.href = "/login";
				return;
			}

			if (!parsedResponse.ok) {
				setMessage("Could not parse capture.");
				return;
			}

			const parsedData = (await parsedResponse.json()) as DraftResponse;

			const createTaskResponse = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: parsedData.draft.title,
					details: parsedData.draft.details,
					dueAt: parsedData.draft.dueAt,
					priority: parsedData.draft.priority,
					estimatedMinutes: parsedData.draft.estimatedMinutes,
					tagNames: parsedData.draft.tags,
				}),
			});

			if (createTaskResponse.status === 401) {
				window.location.href = "/login";
				return;
			}

			if (createTaskResponse.status === 409) {
				setMessage("A matching active task already exists.");
				return;
			}

			if (!createTaskResponse.ok) {
				setMessage("Failed to create task.");
				return;
			}

			setInput("");
			setMessage("Task captured. Commit to it from the list below.");
			window.location.reload();
		});
	};

	return (
		<Card className='py-5'>
			<CardHeader>
				<CardTitle className='text-sm font-semibold uppercase tracking-wide'>Quick Capture</CardTitle>
				<CardDescription>Example: Finish landing page copy by tomorrow 45m #launch</CardDescription>
			</CardHeader>
			<CardContent>
				<Textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder='What are you committing to right now?' className='min-h-28 w-full' />
				<div className='mt-4 flex items-center gap-3'>
					<Button type='button' onClick={submit} disabled={isPending}>
						{isPending ? "Capturing..." : "Capture Task"}
					</Button>
					{message ? <span className='text-xs text-muted-foreground'>{message}</span> : null}
				</div>
			</CardContent>
		</Card>
	);
}
