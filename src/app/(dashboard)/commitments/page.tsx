import { CommitmentFeed } from "@/components/CommitmentFeed";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function serializeCommitments(
	commitments: Array<{
		id: string;
		dueAt: Date | null;
		status: string;
		task: { title: string };
		proofs: { id: string }[];
	}>,
) {
	return commitments.map((item) => ({
		id: item.id,
		dueAt: item.dueAt ? item.dueAt.toISOString() : null,
		status: item.status,
		task: { title: item.task.title },
		proofs: item.proofs.map((proof) => ({ id: proof.id })),
	}));
}

export default async function CommitmentsPage() {
	const user = await getSessionUser();
	if (!user) {
		redirect("/login");
	}

	const commitments = await prisma.commitment.findMany({
		where: { committedById: user.id },
		include: {
			task: true,
			proofs: true,
		},
		orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
		take: 100,
	});

	const now = new Date();
	const oneDayAhead = new Date(now.getTime() + 1000 * 60 * 60 * 24);
	const openCount = commitments.filter((item) => item.status === "COMMITTED").length;
	const completedCount = commitments.filter((item) => item.status === "COMPLETED").length;
	const atRiskCount = commitments.filter((item) => {
		if (item.status !== "COMMITTED") {
			return false;
		}

		const dueSoon = item.dueAt ? item.dueAt <= oneDayAhead : false;
		const missingProof = item.proofs.length === 0;
		return dueSoon || missingProof;
	}).length;

	const serializedCommitments = serializeCommitments(commitments);

	return (
		<main className='min-h-screen bg-background px-6 py-8 text-foreground md:px-10'>
			<div className='mx-auto w-full max-w-6xl'>
				<header className='mb-6'>
					<p className='text-xs uppercase tracking-widest df-subtle'>DUEFORGE</p>
					<h1 className='mt-2 text-3xl font-semibold tracking-tight'>Commitments Hub</h1>
					<p className='mt-2 text-sm df-subtle'>Monitor commitment health, attach proof, and close execution loops.</p>
				</header>

				<section className='mb-6 grid gap-3 md:grid-cols-3'>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase tracking-wide df-subtle'>Open Commitments</p>
						<p className='mt-1 text-2xl font-semibold text-white'>{openCount}</p>
					</article>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase tracking-wide df-subtle'>Completed</p>
						<p className='mt-1 text-2xl font-semibold text-white'>{completedCount}</p>
					</article>
					<article className='df-card px-4 py-3'>
						<p className='text-xs uppercase tracking-wide df-subtle'>At Risk</p>
						<p className='mt-1 text-2xl font-semibold text-amber-300'>{atRiskCount}</p>
					</article>
				</section>

				<CommitmentFeed initialCommitments={serializedCommitments} />
			</div>
		</main>
	);
}
