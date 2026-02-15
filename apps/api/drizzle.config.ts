import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const parsed = new URL(databaseUrl);
const username = decodeURIComponent(parsed.username || "");
const password = decodeURIComponent(parsed.password || "");
const database = parsed.pathname.replace(/^\//, "");
const port = parsed.port ? Number(parsed.port) : 5432;

export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    host: parsed.hostname,
    port,
    user: username,
    password,
    database,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  },
});
