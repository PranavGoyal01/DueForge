import { TrackedCtaLink } from "@/components/landing/TrackedCtaLink";
import { getSessionUser } from "@/lib/auth";

const proofSignals = ["Commitments are visible, not private promises.", "Proof is required before due windows close.", "Drift gets surfaced before deadlines are missed."];

export default async function Home() {
	const user = await getSessionUser();

	return (
		<main className='min-h-screen px-6 py-10 text-foreground md:px-10'>
			<div className='mx-auto w-full max-w-6xl'>
				<header className='mb-12 flex flex-wrap items-center justify-between gap-4'>
					<div>
						<p className='text-xs uppercase tracking-[0.25em] text-amber-300/90'>DUEFORGE</p>
						<p className='mt-2 text-xs df-subtle'>Accountability infrastructure for follow-through.</p>
					</div>
					<div className='flex items-center gap-2'>
						<TrackedCtaLink href='/login' label='Login' eventName='landing_login_click' eventPayload={{ placement: "header" }} className='df-btn-secondary px-3 py-2 text-xs' />
						<TrackedCtaLink href={user ? "/today" : "/login?mode=register&source=landing_header"} label={user ? "Open Command Center" : "Join Waitlist"} eventName='landing_primary_cta_click' eventPayload={{ placement: "header", authenticated: Boolean(user) }} className='df-btn-primary px-3 py-2 text-xs' />
					</div>
				</header>

				<section className='df-panel df-grid-bg relative overflow-hidden p-7 md:p-10'>
					<div className='absolute -right-24 -top-24 h-56 w-56 rounded-full border border-amber-500/25 bg-amber-500/10 blur-sm' />
					<div className='absolute -bottom-16 left-1/2 h-44 w-44 rounded-full border border-emerald-400/25 bg-emerald-400/10 blur-sm' />
					<div className='relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]'>
						<div>
							<p className='text-xs uppercase tracking-[0.2em] text-amber-300/80'>Execution {">"} Intention</p>
							<h1 className='mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl'>Stop planning in private. Build proof-backed momentum every week.</h1>
							<p className='mt-4 max-w-2xl text-sm leading-relaxed text-[var(--df-text-1)]'>DueForge turns commitments into visible, scheduled, and verified execution loops. Capture work quickly, lock it to time, and close every loop with evidence.</p>
							<div className='mt-6 flex flex-wrap gap-3'>
								<TrackedCtaLink href={user ? "/today" : "/login?mode=register&source=landing_hero"} label={user ? "Go To Today" : "Join Waitlist"} eventName='landing_waitlist_click' eventPayload={{ placement: "hero", authenticated: Boolean(user) }} className='df-btn-primary px-4 py-2 text-sm' />
								<TrackedCtaLink href='/demo' label='See Live Demo Mode' eventName='landing_demo_click' eventPayload={{ placement: "hero" }} className='df-btn-secondary px-4 py-2 text-sm' />
							</div>
						</div>

						<div className='space-y-3'>
							{proofSignals.map((signal) => (
								<article key={signal} className='df-card p-4'>
									<p className='text-xs uppercase tracking-wide text-amber-300/85'>Accountability Signal</p>
									<p className='mt-2 text-sm text-white'>{signal}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				<section className='mt-8 grid gap-3 md:grid-cols-3'>
					<article className='df-card p-4'>
						<p className='text-xs uppercase tracking-wide text-amber-300/85'>Capture</p>
						<p className='mt-2 text-sm df-subtle'>Natural language intake for tasks, deadlines, and accountability context in seconds.</p>
					</article>
					<article className='df-card p-4'>
						<p className='text-xs uppercase tracking-wide text-amber-300/85'>Commit</p>
						<p className='mt-2 text-sm df-subtle'>Every active promise becomes visible to your accountability loop before it drifts.</p>
					</article>
					<article className='df-card p-4'>
						<p className='text-xs uppercase tracking-wide text-amber-300/85'>Prove</p>
						<p className='mt-2 text-sm df-subtle'>Attach proof, run check-ins, and close work with evidence, not status theater.</p>
					</article>
				</section>

				<section id='demo' className='mt-8 df-panel p-5'>
					<div className='flex flex-wrap items-center justify-between gap-3'>
						<div>
							<p className='text-xs uppercase tracking-[0.2em] text-amber-300/85'>Live Demo Mode</p>
							<p className='mt-2 text-sm df-subtle'>Explore a synthetic command center and accountability timeline before signing up.</p>
						</div>
						<TrackedCtaLink href='/demo' label='Open Demo' eventName='landing_demo_panel_click' eventPayload={{ placement: "demo_panel" }} className='df-btn-primary px-4 py-2 text-sm' />
					</div>
				</section>
			</div>
		</main>
	);
}
