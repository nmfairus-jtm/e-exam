import { sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.notNull()
		.default(false),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	role: text("role").notNull().default("student"),
	banned: integer("banned", { mode: "boolean" }).notNull().default(false),
	banReason: text("ban_reason"),
	banExpires: integer("ban_expires", { mode: "timestamp" }),
});

export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	impersonatedBy: text("impersonated_by"),
});

export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const question = sqliteTable(
	"question",
	{
		id: text("id").primaryKey(),
		creatorId: text("creator_id")
			.notNull()
			.references(() => user.id),
		type: text("type", { enum: ["objective", "subjective"] }).notNull(),
		prompt: text("prompt").notNull(),
		options: text("options", { mode: "json" }).$type<QuestionOption[]>(),
		exactAnswer: text("exact_answer"),
		rubric: text("rubric", { mode: "json" }).$type<QuestionRubric>(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [index("question_creator_idx").on(t.creatorId)],
);

export const exam = sqliteTable(
	"exam",
	{
		id: text("id").primaryKey(),
		creatorId: text("creator_id")
			.notNull()
			.references(() => user.id),
		title: text("title").notNull(),
		state: text("state", { enum: ["draft", "live", "closed"] })
			.notNull()
			.default("draft"),
		passMark: integer("pass_mark"),
		resultsReleasedAt: integer("results_released_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [index("exam_creator_idx").on(t.creatorId)],
);

export const section = sqliteTable(
	"section",
	{
		id: text("id").primaryKey(),
		examId: text("exam_id")
			.notNull()
			.references(() => exam.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		position: integer("position").notNull(),
	},
	(t) => [index("section_exam_idx").on(t.examId)],
);

export const examQuestion = sqliteTable(
	"exam_question",
	{
		id: text("id").primaryKey(),
		examId: text("exam_id")
			.notNull()
			.references(() => exam.id, { onDelete: "cascade" }),
		sectionId: text("section_id")
			.notNull()
			.references(() => section.id, { onDelete: "cascade" }),
		questionId: text("question_id").references(() => question.id),
		position: integer("position").notNull(),
		pointValue: integer("point_value").notNull(),
		snapshotType: text("snapshot_type", {
			enum: ["objective", "subjective"],
		}).notNull(),
		snapshotPrompt: text("snapshot_prompt").notNull(),
		snapshotOptions: text("snapshot_options", { mode: "json" }).$type<
			QuestionOption[]
		>(),
		snapshotExactAnswer: text("snapshot_exact_answer"),
		snapshotRubric: text("snapshot_rubric", {
			mode: "json",
		}).$type<QuestionRubric>(),
	},
	(t) => [
		index("exam_question_exam_idx").on(t.examId),
		index("exam_question_section_idx").on(t.sectionId),
	],
);

export const distribution = sqliteTable(
	"distribution",
	{
		id: text("id").primaryKey(),
		examId: text("exam_id")
			.notNull()
			.references(() => exam.id, { onDelete: "cascade" }),
		studentId: text("student_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(t) => [
		uniqueIndex("distribution_exam_student_unique").on(t.examId, t.studentId),
	],
);

export const submission = sqliteTable(
	"submission",
	{
		id: text("id").primaryKey(),
		examId: text("exam_id")
			.notNull()
			.references(() => exam.id, { onDelete: "cascade" }),
		studentId: text("student_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: text("status", { enum: ["draft", "submitted"] })
			.notNull()
			.default("draft"),
		submittedAt: integer("submitted_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [
		uniqueIndex("submission_exam_student_unique").on(t.examId, t.studentId),
	],
);

export const answer = sqliteTable(
	"answer",
	{
		id: text("id").primaryKey(),
		submissionId: text("submission_id")
			.notNull()
			.references(() => submission.id, { onDelete: "cascade" }),
		examQuestionId: text("exam_question_id")
			.notNull()
			.references(() => examQuestion.id, { onDelete: "cascade" }),
		value: text("value", { mode: "json" }).$type<AnswerValue>(),
	},
	(t) => [
		uniqueIndex("answer_submission_question_unique").on(
			t.submissionId,
			t.examQuestionId,
		),
	],
);

export const grading = sqliteTable(
	"grading",
	{
		id: text("id").primaryKey(),
		answerId: text("answer_id")
			.notNull()
			.references(() => answer.id, { onDelete: "cascade" }),
		proposedMark: integer("proposed_mark").notNull(),
		rationale: text("rationale"),
		approvedMark: integer("approved_mark"),
		approvedBy: text("approved_by").references(() => user.id),
		approvedAt: integer("approved_at", { mode: "timestamp" }),
		status: text("status", { enum: ["proposed", "approved"] })
			.notNull()
			.default("proposed"),
	},
	(t) => [index("grading_answer_idx").on(t.answerId)],
);

export interface QuestionOption {
	label: string;
	correct?: boolean;
}

export interface QuestionRubric {
	criteria: { label: string; max: number }[];
}

export type AnswerValue = string | number | boolean | { label: string } | null;
