import { ResetPasswordPanel } from "@/components/ResetPasswordPanel";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ResetPasswordPage() {
	const user = await getSessionUser();
	if (user) {
		redirect("/today");
	}

	return (
		<main className='df-auth-shell flex items-center justify-center text-foreground'>
			<div className='df-auth-grid'>
				<section className='df-auth-side'>
					<div>
						<p className='df-page-kicker'>Credential Update</p>
						<h2>Set a stronger key for the next execution sprint.</h2>
						<p className='mt-3'>Choose a new password and return to your command surface with continuity.</p>
					</div>
					<div className='df-auth-highlights'>
						<p>Minimum 8 characters, ideally with mixed symbols.</p>
						<p>Your reset token is validated server-side.</p>
						<p>After update, log in and continue from Today.</p>
					</div>
				</section>

				<div className='flex items-center justify-center'>
					<ResetPasswordPanel />
				</div>
			</div>
		</main>
	);
}
