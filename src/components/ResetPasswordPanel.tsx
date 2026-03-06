"use client";

import { useState } from "react";

export function ResetPasswordPanel() {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [token] = useState(() => {
		if (typeof window === "undefined") {
			return "";
		}

		return new URLSearchParams(window.location.search).get("token") ?? "";
	});
	const [message, setMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const submit = async () => {
		if (!token) {
			setMessage("Reset token is missing.");
			return;
		}

		if (password.length < 8) {
			setMessage("Password must be at least 8 characters.");
			return;
		}

		if (password !== confirmPassword) {
			setMessage("Passwords do not match.");
			return;
		}

		setIsSubmitting(true);
		setMessage(null);

		const response = await fetch("/api/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, password }),
		});

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as { error?: string } | null;
			setMessage(body?.error ?? "Could not reset password.");
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		setMessage("Password updated. You can now log in.");
	};

	return (
		<section className='df-panel w-full max-w-md p-6'>
			<h1 className='text-xl font-semibold text-white'>Set New Password</h1>
			<p className='mt-2 text-sm df-subtle'>Use a strong password for your DueForge account.</p>

			<div className='mt-4 space-y-3'>
				<input type='password' value={password} onChange={(event) => setPassword(event.target.value)} placeholder='New password (min 8 chars)' className='df-input w-full px-3 py-2 text-sm' />
				<input type='password' value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder='Confirm new password' className='df-input w-full px-3 py-2 text-sm' />

				<button type='button' onClick={submit} disabled={isSubmitting} className='df-btn-primary w-full px-4 py-2 text-sm disabled:opacity-60'>
					{isSubmitting ? "Saving..." : "Update Password"}
				</button>

				<p className='text-xs'>
					<a href='/login' className='df-subtle underline'>
						Back to login
					</a>
				</p>

				{message ? <p className='text-xs df-subtle'>{message}</p> : null}
			</div>
		</section>
	);
}
