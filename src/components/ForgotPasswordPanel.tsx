"use client";

import { useState } from "react";

export function ForgotPasswordPanel() {
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const submit = async () => {
		if (!email.trim()) {
			setMessage("Enter your account email.");
			return;
		}

		setIsSubmitting(true);
		setMessage(null);

		const response = await fetch("/api/auth/forgot-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});

		if (!response.ok) {
			setMessage("Could not process request.");
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		setMessage("If the email exists, a reset link has been sent.");
	};

	return (
		<section className='df-panel w-full max-w-md p-6'>
			<h1 className='text-xl font-semibold text-white'>Reset Password</h1>
			<p className='mt-2 text-sm df-subtle'>Enter your email to receive a reset link.</p>

			<div className='mt-4 space-y-3'>
				<input type='email' value={email} onChange={(event) => setEmail(event.target.value)} placeholder='Email' className='df-input w-full px-3 py-2 text-sm' />

				<button type='button' onClick={submit} disabled={isSubmitting} className='df-btn-primary w-full px-4 py-2 text-sm disabled:opacity-60'>
					{isSubmitting ? "Sending..." : "Send Reset Link"}
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
