"use client";

import { Button } from "@/components/ui/button";
import { createRequestId, reportUiError } from "@/lib/observability";
import { useEffect, useMemo } from "react";

type GlobalErrorProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
	const requestId = useMemo(() => createRequestId(), []);

	useEffect(() => {
		reportUiError({
			surface: "global-root",
			requestId,
			error,
		});
	}, [error, requestId]);

	return (
		<html lang='en'>
			<body className='bg-background text-foreground'>
				<div className='mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center px-6 py-10'>
					<div className='df-panel w-full space-y-4 p-6'>
						<p className='text-xs uppercase tracking-[0.18em] df-subtle'>Global failure fallback</p>
						<h1 className='text-2xl font-semibold text-foreground'>DueForge hit an unrecoverable app error.</h1>
						<p className='df-muted text-sm'>Try a full app reset first. If the issue persists, share request id {requestId}.</p>
						<div className='flex gap-3 pt-1'>
							<Button onClick={reset}>Reset app</Button>
							<Button variant='outline' onClick={() => window.location.assign("/")}>Return home</Button>
						</div>
					</div>
				</div>
			</body>
		</html>
	);
}
