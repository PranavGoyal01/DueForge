"use client";

import { Button } from "@/components/ui/button";
import { createRequestId, reportUiError } from "@/lib/observability";
import { useEffect, useMemo } from "react";

type DashboardErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function DashboardError({ error, reset }: DashboardErrorProps) {
	const requestId = useMemo(() => createRequestId(), []);

	useEffect(() => {
		reportUiError({ surface: "dashboard-shell", requestId, error });
	}, [error, requestId]);

	return (
		<div className='mx-auto mt-6 w-full max-w-4xl'>
			<div className='df-panel space-y-4 p-6'>
				<p className='text-xs uppercase tracking-[0.18em] df-subtle'>Dashboard recovery</p>
				<h2 className='text-xl font-semibold text-foreground'>This dashboard section failed to load.</h2>
				<p className='df-muted text-sm'>Try reloading this area. If it repeats, include request id {requestId} in bug reports.</p>
				<div className='flex gap-3'>
					<Button onClick={reset}>Retry section</Button>
					<Button variant='outline' onClick={() => window.location.assign("/today")}>
						Go to today
					</Button>
				</div>
			</div>
		</div>
	);
}
