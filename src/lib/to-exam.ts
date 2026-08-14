import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import type { AnswerValue } from "../db/schema";
import {
	answer,
	distribution,
	exam,
	examQuestion,
	grading,
	section,
	submission,
	user,
} from "../db/schema";
import { requireRole } from "../lib/auth-server";

export const listMyExamsFn = createServerFn({ method: "GET" })
	.middleware([requireRole])
	.handler(async ({ context }) => {
		const studentId = context.session.user.id;
		const distributions = await db
			.select()
			.from(distribution)
			.where(eq(distribution.studentId, studentId));
		const examIds = distributions.map((d) => d.examId);
		if (examIds.length === 0) {
			return [];
		}
		const exams = await db.select().from(exam).where(inArray(exam.id, examIds));
		return exams.filter((e) => e.state === "live" || e.state === "closed");
	});

export const getMySubmissionFn = createServerFn({ method: "GET" })
	.middleware([requireRole])
	.validator(z.object({ examId: z.string() }))
	.handler(async ({ context, data }) => {
		const [row] = await db
			.select()
			.from(submission)
			.where(
				and(
					eq(submission.examId, data.examId),
					eq(submission.studentId, context.session.user.id),
				),
			)
			.limit(1);
		if (!row) {
			return null;
		}
		const answers = await db
			.select()
			.from(answer)
			.where(eq(answer.submissionId, row.id));
		return { submission: row, answers };
	});

export interface TakingState {
	exam: typeof exam.$inferSelect;
	sections: (typeof section.$inferSelect & {
		questions: (typeof examQuestion.$inferSelect)[];
	})[];
	submission: typeof submission.$inferSelect | null;
	answers: Record<string, AnswerValue>;
}

export const getTakingStateFn = createServerFn({ method: "GET" })
	.middleware([requireRole])
	.validator(z.object({ examId: z.string() }))
	.handler(async ({ context, data }) => {
		const studentId = context.session.user.id;
		const role = context.session.user.role;
		const canAccess = role?.includes("student");
		if (!canAccess) {
			throw new Response("Forbidden", { status: 403 });
		}
		const dist = await db
			.select()
			.from(distribution)
			.where(
				and(
					eq(distribution.examId, data.examId),
					eq(distribution.studentId, studentId),
				),
			)
			.limit(1);
		if (dist.length === 0) {
			throw new Response("Not distributed", { status: 403 });
		}
		const [examRow] = await db
			.select()
			.from(exam)
			.where(eq(exam.id, data.examId));
		if (!examRow || examRow.state === "draft") {
			throw new Response("Not found", { status: 404 });
		}
		const sections = await db
			.select()
			.from(section)
			.where(eq(section.examId, data.examId))
			.orderBy(asc(section.position));
		const questions = await db
			.select()
			.from(examQuestion)
			.where(eq(examQuestion.examId, data.examId))
			.orderBy(asc(examQuestion.position));
		const bySection = new Map<string, typeof questions>();
		for (const q of questions) {
			const list = bySection.get(q.sectionId) ?? [];
			list.push(q);
			bySection.set(q.sectionId, list);
		}
		const [existing] = await db
			.select()
			.from(submission)
			.where(
				and(
					eq(submission.examId, data.examId),
					eq(submission.studentId, studentId),
				),
			)
			.limit(1);
		const submissionRow =
			existing ??
			(
				await db
					.insert(submission)
					.values({
						id: crypto.randomUUID(),
						examId: data.examId,
						studentId,
						status: "draft",
					})
					.onConflictDoNothing()
					.returning()
			)[0] ??
			existing;

		const answers = await db
			.select()
			.from(answer)
			.where(eq(answer.submissionId, submissionRow.id));
		const answersMap: Record<string, AnswerValue> = {};
		for (const a of answers) {
			answersMap[a.examQuestionId] = a.value;
		}
		return {
			exam: examRow,
			sections: sections.map((s) => ({
				...s,
				questions: bySection.get(s.id) ?? [],
			})),
			submission: submissionRow,
			answers: answersMap,
		} satisfies TakingState;
	});

const answerValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.object({ label: z.string() }),
	z.null(),
]);

const saveAnswersSchema = z.object({
	examId: z.string(),
	answers: z.record(z.string(), answerValueSchema),
});

export const saveAnswersFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(saveAnswersSchema)
	.handler(async ({ context, data }) => {
		const studentId = context.session.user.id;
		const [submissionRow] = await db
			.select()
			.from(submission)
			.where(
				and(
					eq(submission.examId, data.examId),
					eq(submission.studentId, studentId),
				),
			)
			.limit(1);
		if (!submissionRow) {
			throw new Response("No submission", { status: 400 });
		}
		if (submissionRow.status === "submitted") {
			throw new Response("Already submitted", { status: 400 });
		}
		const [examRow] = await db
			.select()
			.from(exam)
			.where(eq(exam.id, data.examId));
		if (!examRow || examRow.state !== "live") {
			throw new Response("Exam not live", { status: 400 });
		}
		for (const [examQuestionId, value] of Object.entries(data.answers)) {
			await db
				.insert(answer)
				.values({
					id: crypto.randomUUID(),
					submissionId: submissionRow.id,
					examQuestionId,
					value,
				})
				.onConflictDoUpdate({
					target: [answer.submissionId, answer.examQuestionId],
					set: { value },
				});
		}
		await db
			.update(submission)
			.set({ updatedAt: new Date() })
			.where(eq(submission.id, submissionRow.id));
		return { ok: true };
	});

export const submitFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(z.object({ examId: z.string() }))
	.handler(async ({ context, data }) => {
		const studentId = context.session.user.id;
		const [submissionRow] = await db
			.select()
			.from(submission)
			.where(
				and(
					eq(submission.examId, data.examId),
					eq(submission.studentId, studentId),
				),
			)
			.limit(1);
		if (!submissionRow) {
			throw new Response("No submission", { status: 400 });
		}
		if (submissionRow.status === "submitted") {
			throw new Response("Already submitted", { status: 400 });
		}
		const [examRow] = await db
			.select()
			.from(exam)
			.where(eq(exam.id, data.examId));
		if (!examRow || examRow.state !== "live") {
			throw new Response("Exam not live", { status: 400 });
		}
		db.transaction((tx) => {
			tx.update(submission)
				.set({ status: "submitted", submittedAt: new Date() })
				.where(eq(submission.id, submissionRow.id))
				.run();

			const questions = tx
				.select()
				.from(examQuestion)
				.where(eq(examQuestion.examId, data.examId))
				.all();
			const answers = tx
				.select()
				.from(answer)
				.where(eq(answer.submissionId, submissionRow.id))
				.all();
			const answersByQ = new Map(answers.map((a) => [a.examQuestionId, a]));

			for (const q of questions) {
				if (q.snapshotType === "subjective") {
					const ans = answersByQ.get(q.id);
					if (!ans || ans.value == null) {
						continue;
					}
					tx.insert(grading)
						.values({
							id: crypto.randomUUID(),
							answerId: ans.id,
							proposedMark: 0,
							rationale: null,
							status: "proposed",
						})
						.onConflictDoNothing()
						.run();
				}
			}
		});
		await gradeSubjectiveWithDeepSeek(submissionRow.id, data.examId);
		return { ok: true };
	});

async function gradeSubjectiveWithDeepSeek(
	submissionId: string,
	examId: string,
) {
	const apiKey = process.env.DEEPSEEK_API_KEY;
	if (!apiKey) {
		return;
	}
	try {
		const answers = await db
			.select()
			.from(answer)
			.where(eq(answer.submissionId, submissionId));
		const questions = await db
			.select()
			.from(examQuestion)
			.where(eq(examQuestion.examId, examId));
		const qById = new Map(questions.map((q) => [q.id, q]));
		const pending = await db
			.select()
			.from(grading)
			.where(eq(grading.answerId, submissionId));
		const gradings = pending.filter((g) => g.status === "proposed");

		const requests = [];
		for (const grad of gradings) {
			const ans = answers.find((a) => a.id === grad.answerId);
			const qRef = ans ? qById.get(ans.examQuestionId) : undefined;
			if (!ans || !qRef || qRef.snapshotType !== "subjective") {
				continue;
			}
			requests.push({
				gradingId: grad.id,
				question: qRef.snapshotPrompt,
				rubric: qRef.snapshotRubric,
				maxPoints: qRef.pointValue,
				answerValue: ans.value,
			});
		}
		for (const req of requests) {
			const proposal = await callDeepSeek(req);
			if (proposal) {
				await db
					.update(grading)
					.set({ proposedMark: proposal.mark, rationale: proposal.rationale })
					.where(eq(grading.id, req.gradingId));
			}
		}
	} catch {
		// grading proposals may surface any error; leave as-is for manual grading
	}
}

async function callDeepSeek(req: {
	question: string;
	rubric: unknown;
	maxPoints: number;
	answerValue: unknown;
}) {
	const prompt = buildGradingPrompt(req);
	const response = await fetch("https://api.deepseek.com/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
		},
		body: JSON.stringify({
			model: "deepseek-v4-flash",
			response_format: { type: "json_object" },
			messages: [
				{
					role: "system",
					content:
						'You grade exam answers against a rubric. Return JSON: {"mark": number, "rationale": string}.',
				},
				{ role: "user", content: prompt },
			],
		}),
	});
	if (!response.ok) {
		return null;
	}
	const data = await response.json();
	const content = data?.choices?.[0]?.message?.content;
	if (!content) {
		return null;
	}
	try {
		const parsed = JSON.parse(content);
		const mark = Number(parsed.mark);
		if (Number.isNaN(mark)) {
			return null;
		}
		return { mark, rationale: String(parsed.rationale ?? "") };
	} catch {
		return null;
	}
}

function buildGradingPrompt(req: {
	question: string;
	rubric: unknown;
	maxPoints: number;
	answerValue: unknown;
}) {
	return [
		`Question: ${req.question}`,
		`Rubric: ${JSON.stringify(req.rubric)}`,
		`Maximum points: ${req.maxPoints}`,
		`Student answer: ${JSON.stringify(req.answerValue)}`,
		'Return JSON: {"mark": number, "rationale": string}. mark must be between 0 and maximum points.',
	].join("\n");
}

export interface GradingDashboardItem {
	submission: typeof submission.$inferSelect;
	studentName: string;
	total: { earned: number; max: number };
	subjective: (typeof grading.$inferSelect & {
		prompt: string;
	})[];
}

export const getGradingDashboardFn = createServerFn({ method: "GET" })
	.middleware([requireRole])
	.validator(z.object({ examId: z.string() }))
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const [examRow] = await db
			.select()
			.from(exam)
			.where(eq(exam.id, data.examId));
		if (!examRow || examRow.creatorId !== context.session.user.id) {
			throw new Response("Forbidden", { status: 403 });
		}
		const submissions = await db
			.select()
			.from(submission)
			.where(eq(submission.examId, data.examId));
		if (submissions.length === 0) {
			return [];
		}
		const studentIds = [...new Set(submissions.map((s) => s.studentId))];
		const users = await db
			.select()
			.from(user)
			.where(inArray(user.id, studentIds));
		const userMap = new Map(users.map((u) => [u.id, u]));
		const questions = await db
			.select()
			.from(examQuestion)
			.where(eq(examQuestion.examId, data.examId));
		const qById = new Map(questions.map((q) => [q.id, q]));
		const result: GradingDashboardItem[] = [];
		for (const s of submissions) {
			const answers = await db
				.select()
				.from(answer)
				.where(eq(answer.submissionId, s.id));
			let earned = 0;
			let max = 0;
			const subjectiveRows = [];
			for (const a of answers) {
				const qRef = qById.get(a.examQuestionId);
				if (!qRef) {
					continue;
				}
				max += qRef.pointValue;
				if (qRef.snapshotType === "objective") {
					const correct = isObjectiveCorrect(qRef, a.value);
					if (correct) {
						earned += qRef.pointValue;
					}
				} else {
					const grads = await db
						.select()
						.from(grading)
						.where(eq(grading.answerId, a.id));
					const active = grads[grads.length - 1];
					const awarded =
						active?.status === "approved"
							? (active.approvedMark ?? 0)
							: (active?.proposedMark ?? 0);
					earned += awarded;
					if (active) {
						subjectiveRows.push({ ...active, prompt: qRef.snapshotPrompt });
					}
				}
			}
			result.push({
				submission: s,
				studentName: userMap.get(s.studentId)?.name ?? "Unknown",
				total: { earned, max },
				subjective: subjectiveRows,
			});
		}
		return result;
	});

export const approveGradingFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(
		z.object({
			gradingId: z.string(),
			approvedMark: z.number().int().min(0),
		}),
	)
	.handler(async ({ context, data }) => {
		const [grad] = await db
			.select()
			.from(grading)
			.where(eq(grading.id, data.gradingId));
		if (!grad) {
			throw new Response("Not found", { status: 404 });
		}
		const [answerRow] = await db
			.select()
			.from(answer)
			.where(eq(answer.id, grad.answerId));
		const [eqRow] = await db
			.select()
			.from(examQuestion)
			.where(eq(examQuestion.id, answerRow.examQuestionId));
		const [examRow] = await db
			.select()
			.from(exam)
			.where(eq(exam.id, eqRow.examId));
		if (!examRow || examRow.creatorId !== context.session.user.id) {
			throw new Response("Forbidden", { status: 403 });
		}
		await db
			.update(grading)
			.set({
				status: "approved",
				approvedMark: data.approvedMark,
				approvedBy: context.session.user.id,
				approvedAt: new Date(),
			})
			.where(eq(grading.id, data.gradingId));
		return { ok: true };
	});

export const closeExamFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(z.object({ id: z.string() }))
	.handler(async ({ context, data }) => {
		const role = context.session.user.role;
		if (!role?.includes("lecturer") && !role?.includes("administrator")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const [examRow] = await db
			.select()
			.from(exam)
			.where(and(eq(exam.id, data.id), eq(exam.state, "live")));
		if (!examRow || examRow.creatorId !== context.session.user.id) {
			throw new Response("Forbidden", { status: 403 });
		}
		const pending = await db
			.select()
			.from(grading)
			.where(eq(grading.status, "proposed"));
		if (pending.length > 0) {
			throw new Response(
				"Cannot close: subjective grades are still pending approval",
				{ status: 400 },
			);
		}
		await db.update(exam).set({ state: "closed" }).where(eq(exam.id, data.id));
		return { ok: true };
	});

export const releaseResultsFn = createServerFn({ method: "POST" })
	.middleware([requireRole])
	.validator(z.object({ id: z.string() }))
	.handler(async ({ context, data }) => {
		const [examRow] = await db
			.select()
			.from(exam)
			.where(and(eq(exam.id, data.id), eq(exam.state, "closed")));
		if (!examRow || examRow.creatorId !== context.session.user.id) {
			throw new Response("Forbidden", { status: 403 });
		}
		await db
			.update(exam)
			.set({ resultsReleasedAt: new Date() })
			.where(eq(exam.id, data.id));
		return { ok: true };
	});

function isObjectiveCorrect(
	q: typeof examQuestion.$inferSelect,
	value: unknown,
) {
	if (q.snapshotType !== "objective") {
		return false;
	}
	if (Array.isArray(q.snapshotOptions) && q.snapshotOptions.length > 0) {
		const correct = q.snapshotOptions.find((o) => o.correct);
		if (!correct) {
			return false;
		}
		const given =
			typeof value === "object" && value !== null && "label" in value
				? String((value as { label: unknown }).label)
				: String(value);
		return given === String(correct.label);
	}
	if (q.snapshotExactAnswer != null) {
		return value === q.snapshotExactAnswer;
	}
	return false;
}

export const getMyResultFn = createServerFn({ method: "GET" })
	.middleware([requireRole])
	.validator(z.object({ examId: z.string() }))
	.handler(async ({ context, data }) => {
		const studentId = context.session.user.id;
		const role = context.session.user.role;
		if (!role?.includes("student")) {
			throw new Response("Forbidden", { status: 403 });
		}
		const [examRow] = await db
			.select()
			.from(exam)
			.where(eq(exam.id, data.examId));
		if (!examRow || examRow.state !== "closed" || !examRow.resultsReleasedAt) {
			throw new Response("Results not released", { status: 403 });
		}
		const [submissionRow] = await db
			.select()
			.from(submission)
			.where(
				and(
					eq(submission.examId, data.examId),
					eq(submission.studentId, studentId),
				),
			);
		if (!submissionRow) {
			return null;
		}
		const answers = await db
			.select()
			.from(answer)
			.where(eq(answer.submissionId, submissionRow.id));
		const questions = await db
			.select()
			.from(examQuestion)
			.where(eq(examQuestion.examId, data.examId))
			.orderBy(asc(examQuestion.position));
		let earned = 0;
		const max = questions.reduce((sum, q) => sum + q.pointValue, 0);
		const breakdown: {
			examQuestionId: string;
			prompt: string;
			pointValue: number;
			type: "objective" | "subjective";
			correct?: boolean;
			earned: number;
		}[] = [];
		for (const q of questions) {
			const a = answers.find((x) => x.examQuestionId === q.id);
			if (q.snapshotType === "objective") {
				const ok = a ? isObjectiveCorrect(q, a.value) : false;
				const qEarned = ok ? q.pointValue : 0;
				earned += qEarned;
				breakdown.push({
					examQuestionId: q.id,
					prompt: q.snapshotPrompt,
					pointValue: q.pointValue,
					type: "objective",
					correct: ok,
					earned: qEarned,
				});
			} else {
				let awarded = 0;
				if (a) {
					const grads = await db
						.select()
						.from(grading)
						.where(eq(grading.answerId, a.id));
					const active = grads[grads.length - 1];
					if (active?.status === "approved") {
						awarded = active.approvedMark ?? 0;
					}
				}
				earned += awarded;
				breakdown.push({
					examQuestionId: q.id,
					prompt: q.snapshotPrompt,
					pointValue: q.pointValue,
					type: "subjective",
					earned: awarded,
				});
			}
		}
		const pass = examRow.passMark != null ? earned >= examRow.passMark : null;
		return {
			score: earned,
			max,
			passMark: examRow.passMark,
			pass,
			breakdown,
		};
	});
