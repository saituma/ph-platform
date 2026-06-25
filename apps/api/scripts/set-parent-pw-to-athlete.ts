/**
 * One-off: set each team parent's portal password to their child's athlete password,
 * so a parent logs in with THEIR email + the child's known password. Reads the child's
 * plaintext temp password from the original invite emails in the notification outbox.
 *
 * Usage: tsx scripts/set-parent-pw-to-athlete.ts <firstOutboxId> <lastOutboxId>
 */
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { userTable } from "../src/db/schema";
import { hashLocalProvisionPassword } from "../src/services/admin/user.service";

const FROM = Number(process.argv[2] ?? 407);
const TO = Number(process.argv[3] ?? 418);

async function main() {
  const { rows } = await pool.query(
    `select payload->>'to' as email, payload->>'html' as html
     from notification_outbox where id between $1 and $2`,
    [FROM, TO],
  );

  let updated = 0;
  for (const row of rows as Array<{ email: string | null; html: string | null }>) {
    const text = (row.html ?? "").replace(/<[^>]+>/g, " ");
    const m = text.match(/Temporary password:\s*(\S+)/);
    const r = { email: row.email, pw: m ? m[1] : null };
    if (!r.email || !r.pw) {
      console.log("SKIP (no email/pw):", r.email);
      continue;
    }
    const { hash, salt } = hashLocalProvisionPassword(r.pw);
    const res = await db
      .update(userTable)
      .set({ passwordHash: hash, passwordSalt: salt, emailVerified: true, updatedAt: new Date() })
      .where(eq(userTable.email, r.email.toLowerCase()))
      .returning({ id: userTable.id, role: userTable.role });
    console.log(`${r.email}\t-> pw ${r.pw}\t(users updated: ${res.length}, role: ${res[0]?.role ?? "-"})`);
    updated += res.length;
  }
  console.log(`\nDone. Updated ${updated} parent accounts.`);
  await pool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
