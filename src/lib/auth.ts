import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAccessControl } from "better-auth/plugins/access";
import { admin } from "better-auth/plugins/admin";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "../db";
import * as schema from "../db/schema";

const ac = createAccessControl({
	user: defaultStatements.user,
	session: defaultStatements.session,
	question: ["create", "read", "update", "delete"],
	exam: ["create", "read", "update", "grade", "close", "release"],
	submission: ["create", "read"],
	result: ["read"],
});

const lecturer = ac.newRole({
	question: ["create", "read", "update", "delete"],
	exam: ["create", "read", "update", "grade", "close", "release"],
});

const student = ac.newRole({
	exam: ["read"],
	submission: ["create", "read"],
	result: ["read"],
});

const administrator = ac.newRole({
	user: defaultStatements.user,
	session: defaultStatements.session,
	question: ["create", "read", "update", "delete"],
	exam: ["create", "read", "update", "grade", "close", "release"],
	submission: ["create", "read"],
	result: ["read"],
});

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
		},
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
	plugins: [
		admin({
			ac,
			roles: {
				lecturer,
				student,
				administrator,
			},
			defaultRole: "student",
			adminRoles: ["administrator"],
		}),
		tanstackStartCookies(),
	],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
