import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import type { QuestionOption, QuestionRubric } from "../db/schema";
import { question } from "../db/schema";
import { requireRole } from "../lib/auth-server";

const optionSchema = z.object({
	label: z.string(),
	correct: z.boolean().optional(),
});

const rubricSchema = z.object({
	criteria: z.array(z.object({ label: z.string(), max: z.number() })),
});

const createQuestionSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("objective"),
		prompt: z.string().min(1),
		options: z.array(optionSchema).optional(),
		exactAnswer: z.string().optional(),
	}),
	z.object({
		type: z.literal("subjective"),
		prompt: z.string().min(1),
		rubric: rubricSchema,
	}),
]);

const updateQuestionSchema = z.discriminatedUnion("type", [
	z.object({
		id: z.string(),
		type: z.literal("objective"),
		prompt: z.string().min(1),
		options: z.array(optionSchema).optional(),
		exactAnswer: z.string().optional(),
	}),
	z.object({
		id: z.string(),
		type: z.literal("subjective"),
		prompt: z.string().min(1),
		rubric: rubricSchema,
	}),
]);

export const listQuestionsFn = createServerFn({ method: "GET" })
	.middleware([requireRole])
	.handler(async ({ context }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const rows = await db.select().from(question).orderBy(question.createdAt);
		return rows;
	});

export const createQuestionFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(createQuestionSchema)
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const [row] = await db
			.insert(question)
			.values({
				id: crypto.randomUUID(),
				creatorId: context.session.user.id,
				type: data.type,
				prompt: data.prompt,
				options:
					"options" in data
						? (data.options as QuestionOption[] | undefined)
						: undefined,
				exactAnswer: "exactAnswer" in data ? data.exactAnswer : undefined,
				rubric: "rubric" in data ? (data.rubric as QuestionRubric) : undefined,
			})
			.returning();
		return row;
	});

export const updateQuestionFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(updateQuestionSchema)
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const existing = await db
			.select()
			.from(question)
			.where(eq(question.id, data.id))
			.limit(1);
		if (existing.length === 0) {
			throw new Response("Not found", { status: 404 });
		}
		if (existing[0].creatorId !== context.session.user.id) {
			throw new Response("Forbidden", { status: 403 });
		}
		const [row] = await db
			.update(question)
			.set({
				prompt: data.prompt,
				options:
					"options" in data
						? (data.options as QuestionOption[] | undefined)
						: undefined,
				exactAnswer: "exactAnswer" in data ? data.exactAnswer : undefined,
				rubric: "rubric" in data ? (data.rubric as QuestionRubric) : undefined,
			})
			.where(eq(question.id, data.id))
			.returning();
		return row;
	});

export const deleteQuestionFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(z.object({ id: z.string() }))
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const existing = await db
			.select()
			.from(question)
			.where(and(eq(question.id, data.id)))
			.limit(1);
		if (existing.length === 0) {
			throw new Response("Not found", { status: 404 });
		}
		if (existing[0].creatorId !== context.session.user.id) {
			throw new Response("Forbidden", { status: 403 });
		}
		await db.delete(question).where(eq(question.id, data.id));
		return { ok: true };
	});
