import { TrackedCtaLink } from "@/components/landing/TrackedCtaLink";
import { getSessionUser } from "@/lib/auth";

const proofSignals = [
	{ title: "Visible commitments", body: "Turn private intentions into concrete commitments you can actually review." },
	{ title: "Proof-first progress", body: "Close every deadline with proof so momentum compounds instead of fading." },
	{ title: "Early drift alerts", body: "Catch risk before a miss, then recover with a concrete next step." },
];

const coreLoop = [
	{ step: "1", title: "Capture", body: "Drop in tasks quickly with natural language and clear due windows." },
	{ step: "2", title: "Commit", body: "Make commitments visible so follow-through is no longer optional." },
	{ step: "3", title: "Prove", body: "Attach proof, log check-ins, and finish with evidence." },
];

export default async function Home() {
	const user = await getSessionUser();

	return (
		<main className='df-landing min-h-screen px-5 py-8 text-foreground md:px-10 md:py-10'>
			<div className='mx-auto w-full max-w-6xl'>
				<header className='df-fade-in mb-10 flex flex-wrap items-center justify-between gap-4'>
					<div>
						<p className='text-xs uppercase tracking-[0.25em] text-amber-300/90'>DUEFORGE</p>
						<p className='mt-2 text-xs df-subtle'>Calm accountability system for consistent follow-through.</p>
					</div>
					<div className='flex items-center gap-2'>
						<TrackedCtaLink href='/login' label='Login' eventName='landing_login_click' eventPayload={{ placement: "header" }} className='df-btn-secondary px-4 py-2 text-xs' />
						<TrackedCtaLink href={user ? "/today" : "/login?mode=register&source=landing_header"} label={user ? "Open Today" : "Start Free"} eventName='landing_primary_cta_click' eventPayload={{ placement: "header", authenticated: Boolean(user) }} className='df-btn-primary px-4 py-2 text-xs' />
					</div>
				</header>

				<section className='df-panel df-grid-bg df-fade-in relative overflow-hidden p-6 md:p-10'>
					<div className='absolute -right-16 -top-20 h-52 w-52 rounded-full border border-amber-500/30 bg-amber-500/10 blur-xl' />
					<div className='absolute -bottom-10 left-[58%] h-40 w-40 rounded-full border border-emerald-400/30 bg-emerald-400/10 blur-xl' />
					<div className='relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr]'>
						<div>
							<p className='text-[13px] uppercase tracking-[0.2em] text-amber-300/80'>From intent to evidence</p>
							<h1 className='mt-3 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-[var(--df-text-0)] md:text-5xl'>Build weekly momentum without relying on willpower.</h1>
							<p className='mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--df-text-1)]'>DueForge helps you capture work, lock commitments to time, and close loops with proof. It is designed for people who want reliable follow-through, not more planning theater.</p>

							<div className='mt-6 flex flex-wrap gap-3'>
								<TrackedCtaLink href={user ? "/today" : "/login?mode=register&source=landing_hero"} label={user ? "Go To Today" : "Start Free"} eventName='landing_waitlist_click' eventPayload={{ placement: "hero", authenticated: Boolean(user) }} className='df-btn-primary px-5 py-2.5 text-sm' />
								<TrackedCtaLink href='/demo' label='Try Demo' eventName='landing_demo_click' eventPayload={{ placement: "hero" }} className='df-btn-secondary px-5 py-2.5 text-sm' />
							</div>

							<p className='mt-4 text-sm text-[var(--df-text-1)]'>No setup tax. Start with one commitment and one check-in.</p>
						</div>

						<div className='space-y-3'>
							{proofSignals.map((signal, index) => (
								<article key={signal.title} className={`df-card df-staggered ${index === 0 ? "df-delay-1" : index === 1 ? "df-delay-2" : "df-delay-3"} p-4`}>
									<p className='text-xs uppercase tracking-[0.18em] text-amber-300/85'>Accountability signal</p>
									<p className='mt-2 text-base font-medium text-[var(--df-text-0)]'>{signal.title}</p>
									<p className='mt-1 text-sm text-[var(--df-text-1)]'>{signal.body}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				<section className='df-fade-in mt-7 grid gap-3 md:grid-cols-3'>
					{coreLoop.map((item, index) => (
						<article key={item.step} className={`df-card df-staggered ${index === 0 ? "df-delay-2" : index === 1 ? "df-delay-3" : "df-delay-4"} p-5`}>
							<p className='text-xs uppercase tracking-[0.18em] text-amber-300/85'>Step {item.step}</p>
							<p className='mt-2 text-xl font-semibold text-[var(--df-text-0)]'>{item.title}</p>
							<p className='mt-2 text-sm leading-relaxed text-[var(--df-text-1)]'>{item.body}</p>
						</article>
					))}
				</section>

				<section id='demo' className='df-panel df-fade-in mt-7 p-5'>
					<div className='flex flex-wrap items-center justify-between gap-4'>
						<div>
							<p className='text-xs uppercase tracking-[0.2em] text-amber-300/85'>Live demo mode</p>
							<p className='mt-2 text-sm leading-relaxed text-[var(--df-text-1)]'>Explore the command center flow and accountability timeline before you sign up.</p>
						</div>
						<TrackedCtaLink href='/demo' label='Open Demo' eventName='landing_demo_panel_click' eventPayload={{ placement: "demo_panel" }} className='df-btn-primary px-5 py-2.5 text-sm' />
					</div>
				</section>
			</div>
		</main>
	);
}
