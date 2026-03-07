"use client";

import { useState } from "react";

type Mode = "login" | "register";

export function AuthPanel() {
	const [mode, setMode] = useState<Mode>(() => {
		if (typeof window === "undefined") {
			return "login";
		}

		const urlMode = new URLSearchParams(window.location.search).get("mode");
		return urlMode === "register" ? "register" : "login";
	});
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState<string | null>(() => {
		if (typeof window === "undefined") {
			return null;
		}

		const params = new URLSearchParams(window.location.search);
		const verified = params.get("verified");
		const source = params.get("source");
		if (verified === "success") {
			return "Email verified. You can log in now.";
		}

		if (verified === "invalid" || verified === "missing") {
			return "Verification link is invalid or expired.";
		}

		if (source === "landing_header" || source === "landing_hero" || source === "demo") {
			return "You are joining early access. Create your account to enter the waitlist.";
		}

		return null;
	});
	const [isLoading, setIsLoading] = useState(false);

	const submit = async () => {
		setIsLoading(true);
		setMessage(null);

		const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
		const payload = mode === "login" ? { email, password } : { name: name.trim() || "DueForge User", email, password, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };

		const response = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as { error?: string } | null;
			setMessage(body?.error ?? "Authentication failed.");
			setIsLoading(false);
			return;
		}

		setMessage("Authenticated. Redirecting...");
		window.location.href = "/today";
	};

	return (
		<section className='df-panel w-full max-w-md p-6'>
			<h1 className='text-xl font-semibold text-white'>DueForge Access</h1>
			<p className='mt-2 text-sm df-subtle'>Secure your commitments with an authenticated account.</p>

			<div className='df-card mt-5 flex gap-2 p-1 text-xs'>
				<button type='button' className={`flex-1 rounded-md px-3 py-2 ${mode === "login" ? "df-btn-primary" : "df-subtle"}`} onClick={() => setMode("login")}>
					Login
				</button>
				<button type='button' className={`flex-1 rounded-md px-3 py-2 ${mode === "register" ? "df-btn-primary" : "df-subtle"}`} onClick={() => setMode("register")}>
					Register
				</button>
			</div>

			<div className='mt-4 space-y-3'>
				{mode === "register" ? <input type='text' value={name} onChange={(event) => setName(event.target.value)} placeholder='Name' className='df-input w-full px-3 py-2 text-sm' /> : null}

				<input type='email' value={email} onChange={(event) => setEmail(event.target.value)} placeholder='Email' className='df-input w-full px-3 py-2 text-sm' />

				<input type='password' value={password} onChange={(event) => setPassword(event.target.value)} placeholder='Password (min 8 chars)' className='df-input w-full px-3 py-2 text-sm' />

				<button type='button' onClick={submit} disabled={isLoading} className='df-btn-primary w-full px-4 py-2 text-sm disabled:opacity-60'>
					{isLoading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
				</button>

				{mode === "login" ? (
					<p className='text-xs'>
						<a href='/forgot-password' className='df-subtle underline'>
							Forgot password?
						</a>
					</p>
				) : null}

				{message ? <p className='text-xs df-subtle'>{message}</p> : null}
			</div>
		</section>
	);
}
