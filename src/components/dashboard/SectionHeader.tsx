type SectionHeaderProps = {
	title: string;
	description?: string;
};

export function SectionHeader({ title, description }: SectionHeaderProps) {
	return (
		<div className='flex items-center justify-between gap-3'>
			<div>
				<h2 className='text-sm font-semibold uppercase tracking-wide'>{title}</h2>
				{description ? <p className='mt-1 text-xs text-muted-foreground'>{description}</p> : null}
			</div>
		</div>
	);
}
