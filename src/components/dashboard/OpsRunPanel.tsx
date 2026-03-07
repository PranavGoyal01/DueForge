"use client";

import { useState } from "react";

type OpsSummary = {
	label: string;
	payload: Record<string, number>;
};

export function OpsRunPanel() {
	const [isScanning, setIsScanning] = useState(false);
	const [isDispatching, setIsDispatching] = useState(false);
	const [summary, setSummary] = useState<OpsSummary | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function run(path: string, label: string, setLoading: (value: boolean) => void) {
		setLoading(true);
		setError(null);

		const response = await fetch(path, {
			method: "POST",
		});

		if (!response.ok) {
			setSummary(null);
			setError(`Could not run ${label.toLowerCase()}.`);
			setLoading(false);
			return;
		}

		const payload = (await response.json()) as Record<string, number>;
		setSummary({ label, payload });
		setLoading(false);
	}

	return (
		<section className='df-panel p-5'>
			<h2 className='text-sm font-semibold uppercase tracking-wide df-muted'>Operations</h2>
			<p className='mt-2 text-xs df-subtle'>Run drift scan and reminder dispatch manually during user testing sessions.</p>

			<div className='mt-3 flex flex-wrap gap-2'>
				<button type='button' onClick={() => run("/api/jobs/drift-scan", "Drift Scan", setIsScanning)} disabled={isScanning || isDispatching} className='df-btn-primary px-3 py-2 text-xs disabled:opacity-60'>
					{isScanning ? "Running Drift Scan..." : "Run Drift Scan"}
				</button>
				<button type='button' onClick={() => run("/api/jobs/nudges/dispatch", "Nudge Dispatch", setIsDispatching)} disabled={isScanning || isDispatching} className='df-btn-secondary px-3 py-2 text-xs disabled:opacity-60'>
					{isDispatching ? "Dispatching..." : "Dispatch Nudges"}
				</button>
			</div>

			{error ? <p className='mt-3 text-xs text-amber-300'>{error}</p> : null}

			{summary ? (
				<div className='mt-3 df-card p-3'>
					<p className='text-xs uppercase df-subtle'>{summary.label} Result</p>
					<div className='mt-2 grid gap-2 md:grid-cols-3'>
						{Object.entries(summary.payload).map(([key, value]) => (
							<p key={key} className='text-xs text-white'>
								{key}: {value}
							</p>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}
