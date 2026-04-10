import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type FeatureRequestPayload = { title: string; problem: string; impact: string; source?: string; email?: string; name?: string };
type InboxItem = { id: string; requestId: string; createdAt: Date; source: string; title: string; problem: string; impact: string; name?: string; email?: string; actor?: { name: string | null; email: string | null } | null; authenticated: boolean; origin: "persisted" | "legacy" };

function isFeatureRequestPayload(value: unknown): value is FeatureRequestPayload {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return typeof candidate.title === "string" && typeof candidate.problem === "string" && typeof candidate.impact === "string";
}

function formatDate(value: Date) {
	return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(value);
}

export default async function FeatureRequestsPage() {
	const user = await getSessionUser();
	if (!user) {
		redirect("/login");
	}

	const [requests, events] = await Promise.all([prisma.featureRequest.findMany({ include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 120 }), prisma.activityEvent.findMany({ where: { entityType: "feature_request", eventType: "feature.requested" }, include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 120 })]);

	const persistedItems: InboxItem[] = requests.map((request) => ({ id: request.id, requestId: request.requestId, createdAt: request.createdAt, source: request.source, title: request.title, problem: request.problem, impact: request.impact, name: request.name ?? undefined, email: request.email ?? undefined, actor: request.actor, authenticated: Boolean(request.actorId), origin: "persisted" }));

	const legacyItems: InboxItem[] = events
		.map((event) => {
			if (!isFeatureRequestPayload(event.payloadJson)) {
				return null;
			}

			return { id: event.id, requestId: event.entityId, createdAt: event.createdAt, source: event.payloadJson.source ?? "unknown", title: event.payloadJson.title, problem: event.payloadJson.problem, impact: event.payloadJson.impact, name: event.payloadJson.name, email: event.payloadJson.email, actor: event.actor, authenticated: true, origin: "legacy" as const };
		})
		.filter((item): item is NonNullable<typeof item> => Boolean(item));

	const dedupedByRequestId = new Map<string, InboxItem>();
	for (const item of persistedItems) {
		dedupedByRequestId.set(item.requestId, item);
	}
	for (const item of legacyItems) {
		if (!dedupedByRequestId.has(item.requestId)) {
			dedupedByRequestId.set(item.requestId, item);
		}
	}

	const parsed = Array.from(dedupedByRequestId.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	const last7Days = new Date();
	last7Days.setDate(last7Days.getDate() - 7);
	const recentCount = parsed.filter((item) => item.createdAt >= last7Days).length;
	const demoCount = parsed.filter((item) => item.source === "demo").length;
	const landingCount = parsed.filter((item) => item.source === "landing").length;
	const authenticatedCount = parsed.filter((item) => item.authenticated).length;
	const anonymousCount = parsed.length - authenticatedCount;

	return (
		<main className='df-app-page'>
			<div className='mx-auto w-full max-w-6xl space-y-6'>
				<header className='space-y-2'>
					<p className='df-page-kicker'>Founder Inbox</p>
					<h1 className='df-page-title'>Feature Requests</h1>
					<p className='df-page-lead'>Review user-submitted ideas captured from authenticated and anonymous request flows.</p>
				</header>

				<section className='grid gap-3 sm:grid-cols-3'>
					<Card className='py-4'>
						<CardContent>
							<p className='text-xs uppercase text-muted-foreground'>Total Captured</p>
							<p className='mt-1 text-2xl font-semibold'>{parsed.length}</p>
						</CardContent>
					</Card>
					<Card className='py-4'>
						<CardContent>
							<p className='text-xs uppercase text-muted-foreground'>Last 7 Days</p>
							<p className='mt-1 text-2xl font-semibold'>{recentCount}</p>
						</CardContent>
					</Card>
					<Card className='py-4'>
						<CardContent>
							<p className='text-xs uppercase text-muted-foreground'>Intake Split</p>
							<p className='mt-1 text-sm'>Authenticated: {authenticatedCount}</p>
							<p className='text-sm'>Anonymous: {anonymousCount}</p>
							<p className='text-sm'>
								Demo: {demoCount} • Landing: {landingCount}
							</p>
						</CardContent>
					</Card>
				</section>

				<Card className='py-5'>
					<CardContent>
						<SectionHeader title='Inbox Queue' description='Newest submissions first. Data includes durable feature requests with legacy event fallback.' />
						<div className='mt-4 space-y-3'>
							{parsed.length === 0 ? <p className='text-sm text-muted-foreground'>No in-app feature requests captured yet.</p> : null}
							{parsed.map((item) => (
								<div key={item.id} className='rounded-lg border border-border bg-card/60 p-4'>
									<div className='flex flex-wrap items-center gap-2'>
										<p className='text-sm font-semibold'>{item.title}</p>
										<Badge variant='outline'>{item.source || "unknown"}</Badge>
										<Badge variant='secondary'>{item.authenticated ? "authenticated" : "anonymous"}</Badge>
									</div>
									<p className='mt-2 text-xs text-muted-foreground'>
										By {item.name ?? item.actor?.name ?? "Unknown"} ({item.email ?? item.actor?.email ?? "email not provided"}) • {formatDate(item.createdAt)}
									</p>
									<p className='mt-1 text-[11px] text-muted-foreground'>
										Reference: {item.requestId} • Source Record: {item.origin}
									</p>
									<div className='mt-3 grid gap-3 md:grid-cols-2'>
										<div>
											<p className='text-xs uppercase text-muted-foreground'>Problem</p>
											<p className='mt-1 text-sm'>{item.problem}</p>
										</div>
										<div>
											<p className='text-xs uppercase text-muted-foreground'>Impact</p>
											<p className='mt-1 text-sm'>{item.impact}</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
