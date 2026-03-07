import { getSessionUser } from "@/lib/auth";
import { commitmentScopeQuerySchema } from "@/lib/domain/contracts";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function getDateBoundaries() {
	const now = new Date();
	const weekAhead = new Date(now);
	weekAhead.setDate(now.getDate() + 7);
	return { now, weekAhead };
}

export async function GET(request: Request) {
	const user = await getSessionUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const scope = commitmentScopeQuerySchema.parse(url.searchParams.get("scope") ?? "week");
	const { now, weekAhead } = getDateBoundaries();

	const whereByScope =
		scope === "today"
			? {
					dueAt: {
						gte: new Date(new Date().setHours(0, 0, 0, 0)),
						lte: new Date(new Date().setHours(23, 59, 59, 999)),
					},
				}
			: scope === "at_risk"
				? {
						OR: [
							{
								dueAt: {
									lte: new Date(now.getTime() + 1000 * 60 * 60 * 24),
								},
							},
							{
								proofs: {
									none: {},
								},
							},
						],
					}
				: {
						dueAt: {
							gte: now,
							lte: weekAhead,
						},
					};

	const commitments = await prisma.commitment.findMany({
		where: {
			committedById: user.id,
			...whereByScope,
		},
		include: {
			task: true,
			committedTo: true,
			proofs: true,
		},
		orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
	});

	return NextResponse.json({ commitments });
}
