import crypto from "crypto";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";

import { db } from "../db";
import { userTable } from "../db/schema";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const email = process.argv[2] || "dawit.dev.gg@gmail.com";
const name = "Super Admin";
const password = process.env.ADMIN_PASSWORD || "SuperAdmin123!";

function hashPassword(input: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(input, salt, 64).toString("hex");
  return { hash, salt };
}

async function upsertSuperAdmin() {
  const { hash, salt } = hashPassword(password);
  const sub = `local:${crypto.randomUUID()}`;

  const existing = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existing[0]) {
    await db
      .update(userTable)
      .set({
        role: "superAdmin",
        name: existing[0].name || name,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, existing[0].id));
    console.log(`User ${email} updated to superAdmin.`);
    return;
  }

  await db
    .insert(userTable)
    .values({
      email,
      name,
      role: "superAdmin",
      cognitoSub: sub,
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: true,
    });

  console.log(`User ${email} created as superAdmin.`);
}

upsertSuperAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
}).then(() => process.exit(0));
