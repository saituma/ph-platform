import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "../db";
import { userTable } from "../db/schema";
import { ROLES_ADMIN } from "../lib/user-roles";

export async function listPlatformAdminEmailRecipients() {
  return db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(
      and(
        eq(userTable.isDeleted, false),
        eq(userTable.isBlocked, false),
        inArray(userTable.role, ROLES_ADMIN),
        ne(userTable.email, ""),
      ),
    );
}
