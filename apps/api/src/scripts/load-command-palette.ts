/* eslint-disable no-console */

type EndpointSpec = {
  name: string;
  path: string;
};

type RequestStat = {
  endpoint: string;
  ok: boolean;
  status: number;
  elapsedMs: number;
  error?: string;
};

const BASE_URL = process.env.LOAD_BASE_URL ?? "http://localhost:8000";
const AUTH_TOKEN = process.env.LOAD_AUTH_TOKEN ?? "";
const DURATION_SECONDS = Number.parseInt(process.env.LOAD_DURATION_SECONDS ?? "30", 10);
const CONCURRENCY = Number.parseInt(process.env.LOAD_CONCURRENCY ?? "20", 10);
const LIMIT = Number.parseInt(process.env.LOAD_LIMIT ?? "50", 10);
const QUERY_TERMS = (process.env.LOAD_QUERY_TERMS ?? "john,team,premium,booking,video,program")
  .split(",")
  .map((term) => term.trim())
  .filter(Boolean);

const endpoints: EndpointSpec[] = [
  { name: "users", path: "/admin/users" },
  { name: "bookings", path: "/admin/bookings" },
  { name: "threads", path: "/admin/messages/threads" },
  { name: "videos", path: "/admin/videos" },
  { name: "programs", path: "/admin/programs" },
  { name: "food-diary", path: "/admin/food-diary" },
  { name: "referrals", path: "/admin/physio-referrals" },
  { name: "chat-groups", path: "/chat/groups" },
];

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

function randomChoice<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

async function requestOnce(endpoint: EndpointSpec, query: string): Promise<RequestStat> {
  const startedAt = Date.now();
  const url = new URL(`${BASE_URL}${endpoint.path}`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(LIMIT));

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: AUTH_TOKEN
        ? {
            Authorization: `Bearer ${AUTH_TOKEN}`,
          }
        : undefined,
    });
    return {
      endpoint: endpoint.name,
      ok: response.ok,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      endpoint: endpoint.name,
      ok: false,
      status: 0,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function worker(workerId: number, endAt: number, sink: RequestStat[]) {
  while (Date.now() < endAt) {
    const endpoint = randomChoice(endpoints);
    const term = randomChoice(QUERY_TERMS);
    const result = await requestOnce(endpoint, term);
    sink.push(result);

    if (!result.ok && result.status === 401) {
      console.error(`[worker:${workerId}] unauthorized; set LOAD_AUTH_TOKEN`);
      break;
    }
  }
}

function summarize(results: RequestStat[]) {
  const total = results.length;
  const failures = results.filter((entry) => !entry.ok).length;
  const failRate = total > 0 ? (failures / total) * 100 : 100;
  const latencies = results.map((entry) => entry.elapsedMs).sort((a, b) => a - b);
  const avgLatency = latencies.length ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : 0;
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  const byEndpoint = new Map<string, RequestStat[]>();
  for (const result of results) {
    const bucket = byEndpoint.get(result.endpoint) ?? [];
    bucket.push(result);
    byEndpoint.set(result.endpoint, bucket);
  }

  console.log("");
  console.log("=== Command Palette Load Summary ===");
  console.log(`baseUrl      : ${BASE_URL}`);
  console.log(`durationSec  : ${DURATION_SECONDS}`);
  console.log(`concurrency  : ${CONCURRENCY}`);
  console.log(`requests     : ${total}`);
  console.log(`failures     : ${failures} (${failRate.toFixed(2)}%)`);
  console.log(`latency avg  : ${avgLatency.toFixed(1)}ms`);
  console.log(`latency p95  : ${p95.toFixed(1)}ms`);
  console.log(`latency p99  : ${p99.toFixed(1)}ms`);
  console.log("");
  console.log("By endpoint:");
  for (const [endpoint, values] of byEndpoint.entries()) {
    const endpointFailures = values.filter((entry) => !entry.ok).length;
    const endpointLatencies = values.map((entry) => entry.elapsedMs).sort((a, b) => a - b);
    const endpointP95 = percentile(endpointLatencies, 95);
    const endpointAvg = endpointLatencies.length
      ? endpointLatencies.reduce((sum, value) => sum + value, 0) / endpointLatencies.length
      : 0;
    console.log(
      `- ${endpoint}: count=${values.length}, fail=${endpointFailures}, avg=${endpointAvg.toFixed(
        1,
      )}ms, p95=${endpointP95.toFixed(1)}ms`,
    );
  }

  const hardFail = failRate > 1 || p95 > 1200;
  if (hardFail) {
    console.error("");
    console.error("Threshold breach: expected failRate <= 1% and p95 <= 1200ms.");
    process.exitCode = 1;
  }
}

async function main() {
  if (!QUERY_TERMS.length) {
    throw new Error("No query terms provided. Set LOAD_QUERY_TERMS.");
  }
  if (CONCURRENCY <= 0) {
    throw new Error("LOAD_CONCURRENCY must be > 0");
  }
  if (DURATION_SECONDS <= 0) {
    throw new Error("LOAD_DURATION_SECONDS must be > 0");
  }

  console.log(`Starting load test against ${BASE_URL}`);
  const endAt = Date.now() + DURATION_SECONDS * 1000;
  const results: RequestStat[] = [];
  await Promise.all(Array.from({ length: CONCURRENCY }).map((_, index) => worker(index + 1, endAt, results)));
  summarize(results);
}

void main().catch((error) => {
  console.error("Load script failed:", error);
  process.exitCode = 1;
});
