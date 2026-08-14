import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import type { QuestionOption, QuestionRubric } from "../db/schema";
import {
	distribution,
	exam,
	examQuestion,
	question,
	section,
	user,
} from "../db/schema";
import { requireRole } from "../lib/auth-server";

const questionRefSchema = z.object({
	questionId: z.string(),
	sectionId: z.string().optional(),
	position: z.number().int().min(0),
	pointValue: z.number().int().min(1),
});

const createExamSchema = z.object({
	title: z.string().min(1),
	passMark: z.number().int().min(0).optional(),
});

const addQuestionSchema = z.object({
	examId: z.string(),
	questionRefs: z.array(questionRefSchema).min(1),
});

export interface ExamWithSections {
	exam: typeof exam.$inferSelect;
	sections: (typeof section.$inferSelect & {
		questions: (typeof examQuestion.$inferSelect)[];
	})[];
}

export const listExamsFn = createServerFn({ method: "GET" })
	.middleware([requireRole])
	.handler(async ({ context }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		return db.select().from(exam).orderBy(exam.createdAt);
	});

export const getExamFn = createServerFn({ method: "GET" })
	.middleware([requireRole])
	.validator(z.object({ id: z.string() }))
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		const rows = await db
			.select()
			.from(exam)
			.where(eq(exam.id, data.id))
			.limit(1);
		if (rows.length === 0) {
			throw new Response("Not found", { status: 404 });
		}
		const isLecturer =
			role?.includes("lecturer") || role?.includes("administrator");
		const isStudent = role?.includes("student");
		if (!isLecturer && !isStudent) {
			throw new Response("Forbidden", { status: 403 });
		}
		if (isStudent && rows[0].state === "draft") {
			throw new Response("Not found", { status: 404 });
		}
		return loadExamWithSections(data.id);
	});

export const createExamFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(createExamSchema)
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const [row] = await db
			.insert(exam)
			.values({
				id: crypto.randomUUID(),
				creatorId: context.session.user.id,
				title: data.title,
				passMark: data.passMark,
				state: "draft",
			})
			.returning();
		return row;
	});

export const addQuestionsFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(addQuestionSchema)
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const examRows = await db
			.select()
			.from(exam)
			.where(and(eq(exam.id, data.examId), eq(exam.state, "draft")))
			.limit(1);
		if (examRows.length === 0) {
			throw new Response("Exam not found or not editable", { status: 400 });
		}
		if (examRows[0].creatorId !== context.session.user.id) {
			throw new Response("Forbidden", { status: 403 });
		}
		const ids = data.questionRefs.map((r) => r.questionId);
		const bank = await db
			.select()
			.from(question)
			.where(inArray(question.id, ids));
		const bankMap = new Map(bank.map((q) => [q.id, q]));

		const sectionIds = new Set<string>();
		const results = db.transaction((tx) => {
			const created = [];
			for (const ref of data.questionRefs) {
				const bankQuestion = bankMap.get(ref.questionId);
				if (!bankQuestion) {
					throw new Error(`Question ${ref.questionId} not found in bank`);
				}
				let sectionId = ref.sectionId;
				if (!sectionId) {
					const sec = tx
						.insert(section)
						.values({
							id: crypto.randomUUID(),
							examId: data.examId,
							title: "Untitled section",
							position: sectionIds.size,
						})
						.returning()
						.get();
					sectionIds.add(sec.id);
					sectionId = sec.id;
				} else {
					if (!sectionIds.has(sectionId)) {
						sectionIds.add(sectionId);
					}
				}
				const eqRow = tx
					.insert(examQuestion)
					.values({
						id: crypto.randomUUID(),
						examId: data.examId,
						sectionId,
						questionId: bankQuestion.id,
						position: ref.position,
						pointValue: ref.pointValue,
						snapshotType: bankQuestion.type,
						snapshotPrompt: bankQuestion.prompt,
						snapshotOptions: bankQuestion.options as
							| QuestionOption[]
							| undefined,
						snapshotExactAnswer: bankQuestion.exactAnswer,
						snapshotRubric: bankQuestion.rubric as QuestionRubric | undefined,
					})
					.returning()
					.get();
				created.push(eqRow);
			}
			return created;
		});
		return results;
	});

export const publishExamFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(z.object({ id: z.string() }))
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const rows = await db
			.select()
			.from(exam)
			.where(and(eq(exam.id, data.id), eq(exam.state, "draft")))
			.limit(1);
		if (rows.length === 0) {
			throw new Response("Exam not found or not draft", { status: 400 });
		}
		if (rows[0].creatorId !== context.session.user.id) {
			throw new Response("Forbidden", { status: 403 });
		}
		const count = await db
			.select()
			.from(examQuestion)
			.where(eq(examQuestion.examId, data.id));
		if (count.length === 0) {
			throw new Response("Exam has no questions", { status: 400 });
		}
		await db.update(exam).set({ state: "live" }).where(eq(exam.id, data.id));
		return { ok: true };
	});

export const distributeExamFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(
		z.object({
			examId: z.string(),
			studentIds: z.array(z.string()).min(1),
		}),
	)
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const rows = await db
			.select()
			.from(exam)
			.where(and(eq(exam.id, data.examId), eq(exam.state, "live")))
			.limit(1);
		if (rows.length === 0) {
			throw new Response("Exam not live", { status: 400 });
		}
		if (rows[0].creatorId !== context.session.user.id) {
			throw new Response("Forbidden", { status: 403 });
		}
		for (const studentId of data.studentIds) {
			await db
				.insert(distribution)
				.values({ id: crypto.randomUUID(), examId: data.examId, studentId })
				.onConflictDoNothing();
		}
		return { ok: true };
	});

export const listStudentsFn = createServerFn({ method: "GET" })
	.middleware([requireRole])
	.handler(async ({ context }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		return db
			.select()
			.from(user)
			.where(eq(user.role, "student"))
			.orderBy(user.name);
	});

async function loadExamWithSections(examId: string): Promise<ExamWithSections> {
	const [examRow] = await db.select().from(exam).where(eq(exam.id, examId));
	const sections = await db
		.select()
		.from(section)
		.where(eq(section.examId, examId))
		.orderBy(asc(section.position));
	const questions = await db
		.select()
		.from(examQuestion)
		.where(eq(examQuestion.examId, examId))
		.orderBy(asc(examQuestion.position));
	const questionsBySection = new Map<string, typeof questions>();
	for (const q of questions) {
		const list = questionsBySection.get(q.sectionId) ?? [];
		list.push(q);
		questionsBySection.set(q.sectionId, list);
	}
	return {
		exam: examRow,
		sections: sections.map((s) => ({
			...s,
			questions: questionsBySection.get(s.id) ?? [],
		})),
	};
}
