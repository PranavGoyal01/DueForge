import Link from "next/link";

const navItems = [
	{ href: "/today", label: "Command" },
	{ href: "/today", label: "Today" },
	{ href: "/commitments", label: "Commitments" },
	{ href: "/checkins", label: "Check-Ins" },
	{ href: "/schedule", label: "Schedule" },
	{ href: "/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<div className='min-h-screen px-4 py-5 md:px-8'>
			<div className='mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 rounded-xl border border-[var(--df-border-0)] bg-[rgb(20_23_27_/_80%)] p-2'>
				{navItems.map((item) => (
					<Link key={item.href} href={item.href} className='rounded-md px-3 py-1.5 text-xs font-medium tracking-wide text-[var(--df-text-1)] transition hover:bg-[var(--df-surface-0)] hover:text-[var(--df-text-0)]'>
						{item.label}
					</Link>
				))}
			</div>
			<div className='mx-auto mt-4 w-full max-w-6xl'>{children}</div>
		</div>
	);
}
