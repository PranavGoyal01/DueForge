type SectionPlaceholderProps = {
	title: string;
	description: string;
	actionLabel?: string;
	actionHref?: string;
};

export function SectionPlaceholder({ title, description, actionLabel, actionHref }: SectionPlaceholderProps) {
	return (
		<section className='df-panel df-grid-bg p-6'>
			<div className='mb-3 flex items-center justify-between'>
				<h1 className='text-xl font-semibold tracking-tight text-white'>{title}</h1>
				{actionLabel && actionHref ? (
					<a href={actionHref} className='df-btn-primary px-3 py-2 text-xs'>
						{actionLabel}
					</a>
				) : null}
			</div>
			<p className='max-w-2xl text-sm df-subtle'>{description}</p>
		</section>
	);
}
