import "dotenv/config";
import path from "node:path";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Client } from "pg";

async function main() {
  process.env.PH_API_SCRIPT ??= "1";
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const useSsl =
    /sslmode=(require|verify-full|verify-ca)/.test(databaseUrl) ||
    /\.neon\.tech|\.supabase\.co|\.pooler\.supabase\.com|render\.com|\.database\.azure\.com/.test(databaseUrl);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  const db = drizzle(client);

  const folder = path.resolve(process.cwd(), "drizzle");
  const migrations = readMigrationFiles({ migrationsFolder: folder });

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS public.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const applied = await db.execute(sql`select hash from public.__drizzle_migrations`);
  const appliedHashes = new Set(applied.rows.map((r: any) => String(r.hash)));

  let inserted = 0;
  for (const m of migrations) {
    if (appliedHashes.has(m.hash)) continue;
    await db.execute(
      sql`insert into public.__drizzle_migrations ("hash", "created_at") values (${m.hash}, ${m.folderMillis})`,
    );
    inserted += 1;
  }

  console.log(`Backfilled ${inserted} migration record(s). Total in journal: ${migrations.length}`);
  await client.end();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
