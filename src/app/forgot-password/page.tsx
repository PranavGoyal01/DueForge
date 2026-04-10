import { ForgotPasswordPanel } from "@/components/ForgotPasswordPanel";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
	const user = await getSessionUser();
	if (user) {
		redirect("/today");
	}

	return (
		<main className='df-auth-shell flex items-center justify-center text-foreground'>
			<div className='df-auth-grid'>
				<section className='df-auth-side'>
					<div>
						<p className='df-page-kicker'>Account Recovery</p>
						<h2>Recover access without losing execution history.</h2>
						<p className='mt-3'>Use your account email to receive a reset link and continue your commitment workflow securely.</p>
					</div>
					<div className='df-auth-highlights'>
						<p>Reset links are one-time and time-limited.</p>
						<p>Commitments, check-ins, and proof stay intact.</p>
						<p>Re-entry takes less than a minute.</p>
					</div>
				</section>

				<div className='flex items-center justify-center'>
					<ForgotPasswordPanel />
				</div>
			</div>
		</main>
	);
}
