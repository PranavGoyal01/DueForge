import { z } from "zod";

export const taskDraftSchema = z.object({
	title: z.string().trim().min(1).max(140),
	details: z.string().trim().max(4000).optional(),
	projectId: z.string().cuid().optional(),
	tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
	dueAt: z.string().datetime().optional(),
	estimatedMinutes: z
		.number()
		.int()
		.positive()
		.max(8 * 60)
		.optional(),
	priority: z.number().int().min(1).max(3).default(2),
});

export const taskCreateRequestSchema = taskDraftSchema.extend({
	tagNames: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
});

export const commitmentCreateSchema = z.object({
	taskId: z.string().cuid(),
	committedToId: z.string().cuid().optional(),
	visibilityScope: z.enum(["PRIVATE", "PAIR", "GROUP"]).default("PAIR"),
	dueAt: z.string().datetime().optional(),
});

export const checkInCreateSchema = z.object({
	relationshipId: z.string().cuid(),
	scheduledAt: z.string().datetime(),
	mode: z.enum(["VIDEO", "AUDIO", "ASYNC_NOTE"]).default("VIDEO"),
	agenda: z.string().trim().max(1500).optional(),
});

export const checkInOutcomeUpdateSchema = z.object({
	outcome: z.string().trim().min(1).max(2000),
	nextCommitments: z.string().trim().max(2000).optional(),
});

export const proofCreateSchema = z.object({
	commitmentId: z.string().cuid(),
	type: z.enum(["TEXT", "IMAGE", "LINK", "VIDEO"]).default("TEXT"),
	content: z.string().trim().min(1).max(4000),
	markCompleted: z.boolean().default(false),
});

export const nudgeDecisionSchema = z.object({
	commitmentId: z.string().cuid(),
	riskReason: z.enum(["DUE_SOON", "PROOF_MISSING", "MISSED", "NO_ACTIVITY"]),
	channel: z.enum(["IN_APP", "EMAIL"]),
	escalateToPartner: z.boolean().default(false),
});

export const commitmentScopeQuerySchema = z.enum(["today", "week", "at_risk"]).default("week");

export type TaskDraft = z.infer<typeof taskDraftSchema>;
export type TaskCreateRequest = z.infer<typeof taskCreateRequestSchema>;
export type CommitmentCreate = z.infer<typeof commitmentCreateSchema>;
export type CheckInCreate = z.infer<typeof checkInCreateSchema>;
export type CheckInOutcomeUpdate = z.infer<typeof checkInOutcomeUpdateSchema>;
export type ProofCreate = z.infer<typeof proofCreateSchema>;
export type NudgeDecision = z.infer<typeof nudgeDecisionSchema>;
