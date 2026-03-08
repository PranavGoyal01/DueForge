"use client";

import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
		<Card className='py-5'>
			<CardContent>
				<SectionHeader title='Operations' description='Run drift scan and reminder dispatch manually during user testing sessions.' />

				<div className='mt-3 flex flex-wrap gap-2'>
					<Button type='button' onClick={() => run("/api/jobs/drift-scan", "Drift Scan", setIsScanning)} disabled={isScanning || isDispatching} size='sm'>
						{isScanning ? "Running Drift Scan..." : "Run Drift Scan"}
					</Button>
					<Button type='button' onClick={() => run("/api/jobs/nudges/dispatch", "Nudge Dispatch", setIsDispatching)} disabled={isScanning || isDispatching} variant='outline' size='sm'>
						{isDispatching ? "Dispatching..." : "Dispatch Nudges"}
					</Button>
				</div>

				{error ? <p className='mt-3 text-xs text-amber-300'>{error}</p> : null}

				{summary ? (
					<Card className='mt-3 py-3'>
						<CardContent>
							<p className='text-xs uppercase text-muted-foreground'>{summary.label} Result</p>
							<div className='mt-2 grid gap-2 md:grid-cols-3'>
								{Object.entries(summary.payload).map(([key, value]) => (
									<p key={key} className='text-xs'>
										{key}: {value}
									</p>
								))}
							</div>
						</CardContent>
					</Card>
				) : null}
			</CardContent>
		</Card>
	);
}
