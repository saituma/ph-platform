import { db } from "./apps/api/src/db";
import { programSectionContentTable } from "./apps/api/src/db/schema";

async function main() {
  const content = await db.select().from(programSectionContentTable);
  console.log("Section Content:");
  content.forEach(c => {
    console.log(`- ${c.title} (ID: ${c.id}, Type: ${c.sectionType}):`, c.ageList);
  });
  process.exit(0);
}

main().catch(console.error);
