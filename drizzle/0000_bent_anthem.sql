CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `answer` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`exam_question_id` text NOT NULL,
	`value` text,
	FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exam_question_id`) REFERENCES `exam_question`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_submission_question_unique` ON `answer` (`submission_id`,`exam_question_id`);--> statement-breakpoint
CREATE TABLE `distribution` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`student_id` text NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `distribution_exam_student_unique` ON `distribution` (`exam_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `exam` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`title` text NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`pass_mark` integer,
	`results_released_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exam_creator_idx` ON `exam` (`creator_id`);--> statement-breakpoint
CREATE TABLE `exam_question` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`section_id` text NOT NULL,
	`question_id` text,
	`position` integer NOT NULL,
	`point_value` integer NOT NULL,
	`snapshot_type` text NOT NULL,
	`snapshot_prompt` text NOT NULL,
	`snapshot_options` text,
	`snapshot_exact_answer` text,
	`snapshot_rubric` text,
	FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exam_question_exam_idx` ON `exam_question` (`exam_id`);--> statement-breakpoint
CREATE INDEX `exam_question_section_idx` ON `exam_question` (`section_id`);--> statement-breakpoint
CREATE TABLE `grading` (
	`id` text PRIMARY KEY NOT NULL,
	`answer_id` text NOT NULL,
	`proposed_mark` integer NOT NULL,
	`rationale` text,
	`approved_mark` integer,
	`approved_by` text,
	`approved_at` integer,
	`status` text DEFAULT 'proposed' NOT NULL,
	FOREIGN KEY (`answer_id`) REFERENCES `answer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `grading_answer_idx` ON `grading` (`answer_id`);--> statement-breakpoint
CREATE TABLE `question` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`type` text NOT NULL,
	`prompt` text NOT NULL,
	`options` text,
	`exact_answer` text,
	`rubric` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `question_creator_idx` ON `question` (`creator_id`);--> statement-breakpoint
CREATE TABLE `section` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `section_exam_idx` ON `section` (`exam_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `submission` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_exam_student_unique` ON `submission` (`exam_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`role` text DEFAULT 'student' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
