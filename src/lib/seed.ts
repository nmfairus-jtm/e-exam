import { createServerFn } from "@tanstack/react-start";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { account, user } from "../db/schema";

const seedSchema = z.object({
	lecturer: z
		.object({
			email: z.string(),
			password: z.string(),
		})
		.optional(),
	students: z
		.array(z.object({ email: z.string(), password: z.string() }))
		.optional(),
});

export const seedFn = createServerFn({ method: "POST" })
	.validator(seedSchema)
	.handler(async ({ data }) => {
		const created: string[] = [];
		const makeUser = async (
			email: string,
			password: string,
			role: string,
			name: string,
		) => {
			const existing = await db
				.select()
				.from(user)
				.where(eq(user.email, email))
				.limit(1);
			if (existing.length > 0) {
				return existing[0].id;
			}
			const passwordHash = await hashPassword(password);
			const [row] = await db
				.insert(user)
				.values({
					id: crypto.randomUUID(),
					name,
					email,
					emailVerified: true,
					role,
				})
				.returning();
			const existingAccount = await db
				.select()
				.from(account)
				.where(
					and(eq(account.userId, row.id), eq(account.providerId, "credential")),
				)
				.limit(1);
			if (existingAccount.length === 0) {
				await db.insert(account).values({
					id: crypto.randomUUID(),
					accountId: row.id,
					providerId: "credential",
					userId: row.id,
					password: passwordHash,
				});
			}
			created.push(email);
			return row.id;
		};

		if (data.lecturer) {
			await makeUser(
				data.lecturer.email,
				data.lecturer.password,
				"lecturer",
				"Demo Lecturer",
			);
		}
		for (const s of data.students ?? []) {
			await makeUser(s.email, s.password, "student", s.email.split("@")[0]);
		}
		return { created };
	});
