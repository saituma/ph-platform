import crypto from "crypto";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { userTable } from "../db/schema";

const email = process.env.ADMIN_EMAIL ?? "admin@gmail.com";
const name = process.env.ADMIN_NAME ?? "Admin";
const password = process.env.ADMIN_PASSWORD ?? "";

function hashPassword(input: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(input, salt, 64).toString("hex");
  return { hash, salt };
}

function generatePassword() {
  const base = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < 20; i += 1) {
    out += base[Math.floor(Math.random() * base.length)];
  }
  return out;
}

async function upsertAdmin() {
  const finalPassword = password.trim() || generatePassword();
  const { hash, salt } = hashPassword(finalPassword);
  const sub = `local:${crypto.randomUUID()}`;

  const existing = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existing[0]) {
    await db
      .update(userTable)
      .set({
        role: "admin",
        cognitoSub: existing[0].cognitoSub?.startsWith("local:") ? existing[0].cognitoSub : sub,
        name,
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, existing[0].id));
    return { id: existing[0].id, finalPassword };
  }

  const inserted = await db
    .insert(userTable)
    .values({
      email,
      name,
      role: "admin",
      cognitoSub: sub,
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: true,
      verificationCode: null,
      verificationExpiresAt: null,
      verificationAttempts: 0,
    })
    .returning();

  return { id: inserted[0]!.id, finalPassword };
}

async function main() {
  const { finalPassword } = await upsertAdmin();
  if (!password) {
    console.log(`Admin password for ${email}: ${finalPassword}`);
  } else {
    console.log(`Admin user ${email} ensured (password from ADMIN_PASSWORD).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
