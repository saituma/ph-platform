import { Client } from "pg";
import { env } from "../config/env";

function toDirectUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.hostname.includes("-pooler.")) {
      url.hostname = url.hostname.replace("-pooler", "");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

async function check(name: string, connectionString: string) {
  const started = Date.now();
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8_000,
    query_timeout: 8_000,
  });

  try {
    await client.connect();
    const result = await client.query<{ now: string }>("select now()::text as now");
    const ms = Date.now() - started;
    console.log(`[db:doctor] ${name}: OK (${ms}ms) now=${result.rows[0]?.now ?? "?"}`);
  } catch (error) {
    const ms = Date.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[db:doctor] ${name}: FAIL (${ms}ms) ${message}`);
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

async function main() {
  const pooler = env.databaseUrl;
  const direct = toDirectUrl(pooler);
  console.log("[db:doctor] starting checks");
  console.log(`[db:doctor] pooler host: ${new URL(pooler).hostname}`);
  console.log(`[db:doctor] direct host: ${new URL(direct).hostname}`);
  await check("pooler", pooler);
  await check("direct", direct);
}

void main();
