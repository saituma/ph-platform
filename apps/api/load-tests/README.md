# API Load Tests

## Install k6

```bash
# Arch Linux
sudo pacman -S k6

# macOS
brew install k6

# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker run --rm -i grafana/k6 run - <baseline.js
```

## Tests

### baseline.js — Quick smoke test (4 endpoints)

```bash
# Smoke only (no auth)
k6 run --env BASE_URL=http://localhost:3000 baseline.js

# Full suite with auth
k6 run \
  --env BASE_URL=http://localhost:3000 \
  --env AUTH_TOKEN=your-jwt-token \
  baseline.js

# Single scenario
k6 run --env BASE_URL=http://localhost:3000 --scenario smoke baseline.js
```

### full-suite.js — Comprehensive load test (5 scenarios)

Covers smoke, average load, spike, soak (memory leak detection), and rate limit validation across 12+ endpoints.

```bash
# Full suite (all 5 scenarios, ~10 min)
k6 run \
  --env BASE_URL=https://your-api.com \
  --env AUTH_TOKEN=your-jwt-token \
  full-suite.js

# Single scenario
k6 run --env BASE_URL=https://your-api.com --scenario smoke full-suite.js
k6 run --env BASE_URL=https://your-api.com --scenario soak --env AUTH_TOKEN=xxx full-suite.js
```

Results are saved to `results/load-test-<timestamp>.json`.

### prod-readiness.sh — Production readiness audit (no k6 needed)

Checks health, latency, security headers, rate limiting, error handling, compression, and codebase quality.

```bash
# Against local server
./prod-readiness.sh

# Against production
./prod-readiness.sh https://your-api.com

# With auth for full coverage
AUTH_TOKEN=xxx ./prod-readiness.sh https://your-api.com
```

## Baselines

| Endpoint         | p95 Target | Notes                    |
| ---------------- | ---------- | ------------------------ |
| GET /health      | < 50ms     | No DB, no auth           |
| GET /health/deep | < 200ms    | DB connection probe      |
| GET /api/auth/me | < 300ms    | JWT verify + DB lookup   |
| GET /api/bookings| < 500ms    | Auth + query + cache hit |

## Rate Limits

| Tier           | Limit  | Window |
| -------------- | ------ | ------ |
| Global (API)   | 300    | 1 min  |
| Auth endpoints | 30     | 15 min |
| AI endpoints   | 20     | 10 min |
| Delete account | 5      | 1 hour |
