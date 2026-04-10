import { FeatureRequestForm } from "@/components/landing/FeatureRequestForm";
import Link from "next/link";

const demoRows = [
	{ title: "Ship onboarding email sequence", due: "Today 5:00 PM", proof: "Pending", risk: "High" },
	{ title: "Publish waitlist landing refinements", due: "Tomorrow 11:00 AM", proof: "Draft linked", risk: "Medium" },
	{ title: "Weekly founder accountability check-in", due: "Fri 9:30 AM", proof: "Scheduled", risk: "Low" },
];

export default function DemoPage() {
	return (
		<main className='df-landing min-h-screen px-6 py-10 text-foreground md:px-10'>
			<div className='mx-auto w-full max-w-6xl'>
				<header className='mb-8 flex flex-wrap items-center justify-between gap-3'>
					<div>
						<p className='text-xs uppercase tracking-[0.25em] text-amber-300/90'>DUEFORGE DEMO</p>
						<h1 className='mt-2 text-3xl font-semibold tracking-tight'>Live Demo Mode</h1>
						<p className='mt-2 text-base df-subtle'>Synthetic data preview of the execution loop, commitment signals, and accountability surfaces.</p>
					</div>
					<div className='flex items-center gap-2'>
						<Link href='/' className='df-btn-secondary px-3 py-2 text-xs'>
							Back to Landing
						</Link>
						<Link href='/login?mode=register&source=demo' className='df-btn-primary px-3 py-2 text-xs'>
							Join Waitlist
						</Link>
					</div>
				</header>

				<section className='df-panel df-grid-bg p-6'>
					<div className='grid gap-3 md:grid-cols-3'>
						<article className='df-card p-4'>
							<p className='text-xs uppercase tracking-wide text-amber-300/85'>Open Commitments</p>
							<p className='mt-2 text-2xl font-semibold text-white'>7</p>
						</article>
						<article className='df-card p-4'>
							<p className='text-xs uppercase tracking-wide text-amber-300/85'>Proof Completion</p>
							<p className='mt-2 text-2xl font-semibold text-white'>64%</p>
						</article>
						<article className='df-card p-4'>
							<p className='text-xs uppercase tracking-wide text-amber-300/85'>At-Risk Items</p>
							<p className='mt-2 text-2xl font-semibold text-amber-300'>2</p>
						</article>
					</div>

					<div className='mt-5 space-y-3'>
						{demoRows.map((row) => (
							<article key={row.title} className='df-card p-4'>
								<div className='flex flex-wrap items-center justify-between gap-3'>
									<div>
										<p className='text-sm font-medium text-white'>{row.title}</p>
										<p className='mt-1 text-sm df-subtle'>Due {row.due}</p>
									</div>
									<div className='text-right'>
										<p className='text-xs uppercase text-amber-300/85'>Proof</p>
										<p className='text-sm text-white'>{row.proof}</p>
									</div>
									<div className='text-right'>
										<p className='text-xs uppercase text-amber-300/85'>Risk</p>
										<p className='text-sm text-white'>{row.risk}</p>
									</div>
								</div>
							</article>
						))}
					</div>
				</section>

				<FeatureRequestForm />
			</div>
		</main>
	);
}
