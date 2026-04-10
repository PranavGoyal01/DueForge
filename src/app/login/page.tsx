import { AuthPanel } from "@/components/AuthPanel";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
	const user = await getSessionUser();
	if (user) {
		redirect("/today");
	}

	return (
		<main className='df-auth-shell flex items-center justify-center text-foreground'>
			<div className='df-auth-grid'>
				<section className='df-auth-side'>
					<div>
						<p className='df-page-kicker'>DueForge Access</p>
						<h2>Build consistency you can actually verify.</h2>
						<p className='mt-3'>Sign in to capture work, lock commitments, and close deadlines with proof instead of memory.</p>
					</div>
					<div className='df-auth-highlights'>
						<p>Visible commitments keep execution honest.</p>
						<p>Proof submissions make progress reviewable.</p>
						<p>Drift alerts catch misses before they compound.</p>
					</div>
				</section>

				<div className='flex items-center justify-center'>
					<AuthPanel />
				</div>
			</div>
		</main>
	);
}
