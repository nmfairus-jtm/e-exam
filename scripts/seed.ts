import { hashPassword } from "@better-auth/utils/password";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const sqlite = new Database("data/e-exam.db");
const db = drizzle(sqlite, { schema });

async function makeUser(
  name: string,
  email: string,
  password: string,
  role: "student" | "lecturer",
) {
  const existing = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (existing.length > 0) {
    console.log(`exists: ${email}`);
    return existing[0].id;
  }
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(schema.user)
    .values({
      id: crypto.randomUUID(),
      name,
      email,
      emailVerified: true,
      role,
    })
    .returning();
  await db.insert(schema.account).values({
    id: crypto.randomUUID(),
    accountId: row.id,
    providerId: "credential",
    userId: row.id,
    password: passwordHash,
  });
  console.log(`created: ${email} (${role})`);
  return row.id;
}

await makeUser("Demo Lecturer", "lecturer@test.edu", "password123", "lecturer");
await makeUser("Demo Student", "student@test.edu", "password123", "student");
await makeUser("Second Student", "student2@test.edu", "password123", "student");
sqlite.close();
console.log("done");