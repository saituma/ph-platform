import { db } from "./apps/api/src/db";
import { programSectionContentTable, athleteTable, userTable } from "./apps/api/src/db/schema";
import { calculateAge, normalizeDate } from "./apps/api/src/lib/age";
import { eq } from "drizzle-orm";

async function main() {
  const content = await db.select().from(programSectionContentTable);
  console.log("Section Content AgeLists:");
  content.forEach(c => {
    if (c.ageList) {
      console.log(`- ${c.title} (ID: ${c.id}):`, c.ageList);
    }
  });

  const athletes = await db.select().from(athleteTable);
  console.log("\nAthletes:");
  athletes.forEach(a => {
    const bday = normalizeDate(a.birthDate as any);
    const calculated = bday ? calculateAge(bday) : a.age;
    console.log(`- ${a.name} (ID: ${a.id}): birthDate=${a.birthDate}, calculatedAge=${calculated}, rawAge=${a.age}`);
  });
  
  process.exit(0);
}

main().catch(console.error);
