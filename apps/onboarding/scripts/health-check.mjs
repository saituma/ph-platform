/**
 * Simple health check script that can be run by external monitors (UptimeRobot, etc.)
 * or as a pre-deploy verification.
 *
 * Usage: node scripts/health-check.mjs [url]
 * Default URL: http://localhost:5173/api/health
 */
const url = process.argv[2] || "http://localhost:5173/api/health";

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);

  if (!response.ok) {
    console.error(`Health check failed: HTTP ${response.status}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log(`✓ ${data.status} | ${data.environment} | uptime: ${Math.round(data.uptime)}s`);
  process.exit(0);
} catch (err) {
  console.error(`Health check failed: ${err.message}`);
  process.exit(1);
}
