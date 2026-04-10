"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ href: "/today", label: "Today" },
	{ href: "/commitments", label: "Commitments" },
	{ href: "/checkins", label: "Check-ins" },
	{ href: "/schedule", label: "Schedule" },
	{ href: "/feature-requests", label: "Inbox" },
	{ href: "/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const pathname = usePathname();

	return (
		<div className='df-app-shell min-h-screen px-4 py-4 md:px-8 md:py-6'>
			<div className='mx-auto w-full max-w-6xl'>
				<header className='df-app-nav'>
					<div className='flex flex-wrap items-end justify-between gap-3 px-1'>
						<div>
							<p className='df-page-kicker'>DueForge Ops</p>
							<p className='mt-1 text-xs text-[var(--df-text-1)]'>Execution surfaces for commitments, proof, and recovery.</p>
						</div>
						<p className='rounded-full border border-[color:var(--border)] bg-[rgb(20_27_37_/_60%)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-200/90'>
							Internal Dashboard
						</p>
					</div>

					<nav className='flex flex-wrap gap-1.5'>
						{navItems.map((item) => {
							const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

							return (
								<Link key={item.href} href={item.href} className={cn("df-app-nav-link", isActive && "df-app-nav-link-active")}>
									{item.label}
								</Link>
							);
						})}
					</nav>
				</header>

				<div className='mt-5 w-full md:mt-6'>{children}</div>
			</div>
		</div>
	);
}
