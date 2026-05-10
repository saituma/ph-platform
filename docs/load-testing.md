# Load Testing — PH Performance API

k6-based load testing suite covering auth, athlete portal, parent/guardian portal, admin dashboard, and Socket.IO connection handling.

All test files live in `scripts/load/`.

---

## 1. Prerequisites

### Install k6

```bash
# macOS
brew install k6

# Arch Linux
sudo pacman -S k6

# Debian/Ubuntu
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker alternative (no install)
docker run --rm -i grafana/k6 run - < scripts/load/scenarios/auth.js
```

---

## 2. Required env vars

| Variable | Description | Example |
|---|---|---|
| `BASE_URL` | API base URL (no trailing slash) | `http://localhost:3000` |
| `API_URL` | Overrides `/api` path if non-standard | `https://api.example.com/api` |
| `TEST_USER_EMAIL` | Athlete test account | `loadtest@phperformance.com` |
| `TEST_USER_PASSWORD` | Athlete test account password | (secret) |
| `PARENT_TEST_EMAIL` | Guardian test account | `parent-loadtest@phperformance.com` |
| `PARENT_TEST_PASSWORD` | Guardian test account password | (secret) |
| `ADMIN_TEST_EMAIL` | Admin/coach test account | `admin-loadtest@phperformance.com` |
| `ADMIN_TEST_PASSWORD` | Admin test account password | (secret) |

Store these in a `.env.loadtest` file (never committed) and source it before running:

```bash
set -a; source .env.loadtest; set +a
k6 run scripts/load/suite.js
```

---

## 3. Pre-test setup — seed test users

The load tests expect three pre-seeded accounts with specific roles. Run these against your target DB before the first test run.

### Athlete account

```bash
# Use the existing seed-admin script as a template, or register via API:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"loadtest@phperformance.com","password":"loadtest123","name":"Load Test Athlete"}'
```

Then confirm the account and assign a billing plan via the admin dashboard.

### Admin account

```bash
# Use the seed script
cd apps/api
pnpm seed:admin
# Then set password:
pnpm admin:set-password
```

Or provision via the admin dashboard under Users > Provision Adult Athlete, then promote the role.

### Guardian account

Register via `/api/auth/register`, then complete guardian onboarding. Assign at least one child athlete for the parent portal tests to drill into child endpoints.

---

## 4. Running scenarios

### Smoke test (local, 30 s)

```bash
./scripts/load/smoke.sh
# or
BASE_URL=http://localhost:3000 ./scripts/load/smoke.sh
```

### Individual scenarios

```bash
# Auth endpoints
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/auth.js

# Athlete portal
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/user-portal.js

# Parent/guardian portal
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/parent-portal.js

# Admin dashboard
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/admin.js

# Socket.IO HTTP polling
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/socket-connect.js

# Reconnect storm
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/reconnect-storm.js
```

### Full suite

```bash
k6 run \
  -e BASE_URL=https://ph-performance-2cae29f7922d.herokuapp.com \
  -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
  -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
  -e ADMIN_TEST_EMAIL="$ADMIN_TEST_EMAIL" \
  -e ADMIN_TEST_PASSWORD="$ADMIN_TEST_PASSWORD" \
  -e PARENT_TEST_EMAIL="$PARENT_TEST_EMAIL" \
  -e PARENT_TEST_PASSWORD="$PARENT_TEST_PASSWORD" \
  scripts/load/suite.js
```

### pnpm aliases (from repo root)

```bash
pnpm --filter api load:smoke      # 2 VUs, 30 s
pnpm --filter api load:auth       # auth scenario
pnpm --filter api load:portal     # athlete portal
pnpm --filter api load:admin      # admin dashboard
pnpm --filter api load:suite      # full parallel suite
pnpm --filter api load:reconnect  # reconnect storm
```

---

## 5. Thresholds

| Metric | Smoke | Load | Stress |
|---|---|---|---|
| p95 latency (auth) | < 500 ms | < 500 ms | < 1000 ms |
| p95 latency (portal) | < 800 ms | < 800 ms | < 2000 ms |
| p95 latency (admin) | < 1000 ms | < 1000 ms | < 3000 ms |
| p99 latency (auth) | < 1000 ms | < 1000 ms | < 2000 ms |
| p99 latency (portal/admin) | < 2000 ms | < 2000 ms | < 5000 ms |
| Error rate (REST) | < 1% | < 1% | < 5% |
| Socket connect fail | < 5% | < 5% | < 10% |

---

## 6. Ramp-up plan

| Week | Profile | Target | Environment |
|---|---|---|---|
| Week 1 | Smoke (2 VUs, 30 s) | Validate test users seeded, scripts parse | Local / staging |
| Week 2 | Load (50 VUs peak) | Confirm p95 thresholds pass | Staging |
| Week 3 | Stress (200 VUs peak) | Find breaking point, tune DB pool | Staging |
| Pre-launch | Full suite (suite.js) | All thresholds green with read-only test accounts | Production |

---

## 7. Metrics to watch during tests

### Heroku (API host)

```bash
# Stream logs during a load test run
heroku logs --tail --app ph-performance

# Check dyno metrics (requires Heroku metrics add-on or dashboard)
heroku ps --app ph-performance
```

- **CPU usage** — should stay < 80% during sustained load; visible in Heroku dashboard under Metrics
- **Memory** — standard-1x dynos have 512 MB RAM; watch for R14 (memory quota exceeded) log errors
- **Response time** — visible in Heroku dashboard → Metrics → Response time
- **R10 errors** (boot timeout) and **H12 errors** (request timeout at 30 s) — check `heroku logs` during run
- **Dyno restarts** — any restart during a load test invalidates results

### Heroku Postgres connection limits by plan

| Plan | Max connections |
|---|---|
| Mini | 25 |
| Basic | 25 |
| Standard-0 | 25 |
| Standard-2 | 400 |
| Premium-0 | 400 |
| Premium-2 | 500 |

With default `DB_POOL_MAX=5`, you can safely run up to 5 dynos on a Standard-0 plan (25 connections).
For more dynos or higher concurrency, upgrade to Standard-2 or add a PgBouncer sidecar.

```bash
# Check live DB connection count during a test
heroku pg:info --app ph-performance
heroku pg:psql --app ph-performance -c "SELECT count(*) FROM pg_stat_activity;"
```

### Upstash Redis (rate limiter)

- **Requests/second** — auth rate limiter is keyed per-IP; load test VUs share an IP by default which may 429 earlier than real traffic
- Fix: run k6 from multiple IP sources or temporarily raise rate limits for the load test user

### BullMQ (Heroku Redis)

```bash
# Check REDIS_URL is set
heroku config:get REDIS_URL --app ph-performance
```

- **Queue depth** — confirm jobs are draining, not accumulating during load
- **Job failure rate** — should stay < 1%

---

## 8. Heroku-specific setup

### Socket.IO sticky sessions (required for multiple dynos)

Heroku load-balances across dynos randomly by default. Socket.IO requires that a client's requests hit the same dyno (for the polling transport fallback and connection state). Enable sticky sessions:

```bash
heroku features:enable http-session-affinity --app ph-performance
```

Without this, clients using polling transport (mobile with unreliable WebSocket) will disconnect frequently as requests land on different dynos.

If you run 2+ dynos **and** want accurate presence/rooms across dynos, also set `SOCKET_REQUIRE_REDIS=true` and configure `REDIS_URL` (Heroku Redis add-on).

### Heroku Postgres URL

Heroku auto-provisions `DATABASE_URL` as a direct (non-pooled) connection. You do not need `DIRECT_DATABASE_URL` unless you add a PgBouncer sidecar.

```bash
# Confirm DATABASE_URL is set
heroku config:get DATABASE_URL --app ph-performance
```

For multi-dyno deployments without PgBouncer, keep `DB_POOL_MAX` low:

```bash
heroku config:set DB_POOL_MAX=5 --app ph-performance
# Total connections = dynos × 5; keep under plan limit (25 for Standard-0)
```

### Heroku Redis add-on (BullMQ + Socket.IO adapter)

```bash
heroku addons:create heroku-redis:mini --app ph-performance
# REDIS_URL is auto-set after provisioning
heroku config:get REDIS_URL --app ph-performance
```

### Running load tests against Heroku

```bash
# Set your app URL
export BASE_URL=https://ph-performance-2cae29f7922d.herokuapp.com

# Smoke test
./scripts/load/smoke.sh

# Full suite
set -a; source .env.loadtest; set +a
k6 run -e BASE_URL="$BASE_URL" scripts/load/suite.js
```

---

## 9. DB connection math

From `docs/db-connection-strategy.md`:

- API uses a `pg` connection pool. Default `DB_POOL_MAX` = 5 in production.
- Under 100 concurrent VUs each hitting DB-backed endpoints, expect ~20–40 concurrent DB connections.
- Heroku Postgres Standard-0 has 25 connection limit — safe for up to 5 dynos at `DB_POOL_MAX=5`.
- If you see `remaining connection slots are reserved` errors during load tests, either reduce VU count, lower `DB_POOL_MAX`, or upgrade to a higher Heroku Postgres plan.

```bash
# Live connection count during a test
heroku pg:psql --app ph-performance -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

---

## 9. Known limitations

| Limitation | Impact | Workaround |
|---|---|---|
| k6 does not speak Socket.IO protocol natively | Cannot test real-time event delivery (emit/on) | Test HTTP polling transport only; supplement with Playwright WS tests |
| All VUs share the same IP | Rate limiter may 429 sooner than real users | Run k6 from multiple machines or use k6 Cloud for distributed IPs |
| Login is re-done every iteration | Auth endpoint gets disproportionate traffic | Use k6 `setup()` to login once per VU and reuse the token |
| Test users must be pre-seeded | Cannot run against a fresh DB | Add test user seeding to staging deploy pipeline |
| Stripe/RevenueCat webhooks not tested | Payment confirmation flow untested | Use Stripe CLI `stripe trigger` for webhook testing separately |
