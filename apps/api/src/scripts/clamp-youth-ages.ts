import { and, eq, lt } from "drizzle-orm";

import { db, pool } from "../db";
import { athleteTable } from "../db/schema";
import { MIN_YOUTH_AGE } from "../lib/age";

async function main() {
  const updated = await db
    .update(athleteTable)
    .set({
      age: MIN_YOUTH_AGE,
      updatedAt: new Date(),
    })
    .where(and(eq(athleteTable.athleteType, "youth"), lt(athleteTable.age, MIN_YOUTH_AGE)))
    .returning({
      id: athleteTable.id,
    });

  console.log(
    `[clamp-youth-ages] Updated ${updated.length} youth athlete(s) with age < ${MIN_YOUTH_AGE} to age ${MIN_YOUTH_AGE}.`,
  );
}

main()
  .catch((error) => {
    console.error("[clamp-youth-ages] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

