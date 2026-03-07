"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";

type TrackedCtaLinkProps = {
	href: string;
	label: string;
	eventName: string;
	className: string;
	eventPayload?: Record<string, string | number | boolean>;
};

export function TrackedCtaLink({ href, label, eventName, className, eventPayload }: TrackedCtaLinkProps) {
	return (
		<Link
			href={href}
			className={className}
			onClick={() => {
				track(eventName, {
					href,
					...eventPayload,
				});
			}}
		>
			{label}
		</Link>
	);
}
