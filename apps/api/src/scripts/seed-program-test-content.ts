import { db } from "../db";
import { programSectionContentTable, programTable, userTable } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting seeding test content for ages 5-20...");

  // 1. Get an admin user
  const admin = await db.select().from(userTable).where(eq(userTable.role, "admin")).limit(1);
  if (!admin[0]) {
    console.log("No admin user found, checking superAdmin...");
    const superAdmin = await db.select().from(userTable).where(eq(userTable.role, "superAdmin")).limit(1);
    if (!superAdmin[0]) {
       throw new Error("No admin or superAdmin user found to attribute content to.");
    }
    admin[0] = superAdmin[0];
  }
  const adminId = admin[0].id;

  // 2. Ensure programs exist for all tiers to test AI insights
  const tiers: ("PHP" | "PHP_Plus" | "PHP_Premium")[] = ["PHP", "PHP_Plus", "PHP_Premium"];
  for (const tier of tiers) {
    const existing = await db.select().from(programTable).where(eq(programTable.type, tier)).limit(1);
    if (!existing[0]) {
      await db.insert(programTable).values({
        name: `${tier.replace("_", " ")} Program`,
        type: tier,
        description: `This is the ${tier} program description for testing.`,
        minAge: 5,
        maxAge: 20,
        createdBy: adminId,
      });
      console.log(`Created ${tier} program.`);
    }
  }

  // 3. Clear old test content to avoid clutter (optional, but good for clean test)
  // await db.delete(programSectionContentTable).where(eq(programSectionContentTable.createdBy, adminId));

  // 4. Seed content for different ages and sections
  const sections: any[] = [
    "program", "warmup", "cooldown", "stretching", "mobility", "recovery", "offseason", "inseason", "education", "nutrition"
  ];

  const ageGroups = [
    { label: "Junior (5-7)", ages: [5, 6, 7] },
    { label: "Youth (10-12)", ages: [10, 11, 12] },
    { label: "Elite (18-20)", ages: [18, 19, 20] },
    { label: "Universal", ages: null as number[] | null }, // Applies to all
  ];

  for (const section of sections) {
    for (const group of ageGroups) {
      await db.insert(programSectionContentTable).values({
        sectionType: section,
        programTier: "PHP_Premium",
        ageList: group.ages,
        title: `${group.label} ${section.toUpperCase()} Content`,
        body: `### ${group.label} Guidance\n\nThis is a test content specialized for **${group.label}** players in the **${section}** section. It includes age-appropriate drills and tips.\n\n- Point 1\n- Point 2`,
        order: group.ages ? group.ages[0] : 1,
        createdBy: adminId,
        metadata: {
            sets: 3,
            reps: 10,
            category: "Technical",
            equipment: "Football, Cones"
        }
      });
    }
  }

  console.log("Successfully seeded test content for all sections and age groups.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
