"use client";

import { useState } from "react";

type GoogleCalendarConnectButtonProps = {
	isConnected: boolean;
};

export function GoogleCalendarConnectButton({ isConnected }: GoogleCalendarConnectButtonProps) {
	const [isConnecting, setIsConnecting] = useState(false);
	const [isRecreating, setIsRecreating] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const connect = async () => {
		setIsConnecting(true);
		setMessage(null);

		const response = await fetch("/api/integrations/google/connect", {
			method: "POST",
		});

		const body = (await response.json().catch(() => null)) as { authUrl?: string; error?: string } | null;

		if (response.status === 401) {
			window.location.href = "/login";
			return;
		}

		if (!response.ok || !body?.authUrl) {
			setMessage(body?.error ?? "Could not start Google OAuth.");
			setIsConnecting(false);
			return;
		}

		window.location.href = body.authUrl;
	};

	const recreateDedicatedCalendar = async () => {
		setIsRecreating(true);
		setMessage(null);

		const response = await fetch("/api/integrations/google/recreate-calendar", {
			method: "POST",
		});

		const body = (await response.json().catch(() => null)) as { error?: string; calendarId?: string } | null;

		if (response.status === 401) {
			window.location.href = "/login";
			return;
		}

		if (!response.ok) {
			setMessage(body?.error ?? "Could not recreate dedicated calendar.");
			setIsRecreating(false);
			return;
		}

		setMessage("Dedicated DueForge calendar recreated.");
		setIsRecreating(false);
	};

	return (
		<div className='flex flex-col items-start gap-2'>
			<p className={`text-xs ${isConnected ? "text-amber-300" : "df-subtle"}`}>{isConnected ? "Google Calendar connected" : "Google Calendar not connected"}</p>
			<button type='button' onClick={connect} disabled={isConnecting} className='df-btn-secondary px-3 py-2 text-xs disabled:opacity-60'>
				{isConnecting ? "Connecting..." : isConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
			</button>

			{isConnected ? (
				<button type='button' onClick={recreateDedicatedCalendar} disabled={isRecreating} className='df-btn-secondary px-3 py-2 text-xs disabled:opacity-60'>
					{isRecreating ? "Recreating..." : "Recreate Dedicated Calendar"}
				</button>
			) : null}

			{message ? <p className='text-xs df-subtle'>{message}</p> : null}
		</div>
	);
}
