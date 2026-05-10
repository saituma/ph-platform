# PH Performance API — k6 Load Testing

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu/Arch)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Arch Linux
sudo pacman -S k6
```

## Required env vars

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | API base URL |
| `TEST_USER_EMAIL` | `loadtest@example.com` | Athlete test account email |
| `TEST_USER_PASSWORD` | `loadtest123` | Athlete test account password |
| `PARENT_TEST_EMAIL` | `parent-loadtest@example.com` | Guardian test account |
| `PARENT_TEST_PASSWORD` | `loadtest123` | Guardian test account password |
| `ADMIN_TEST_EMAIL` | `admin-loadtest@example.com` | Admin test account |
| `ADMIN_TEST_PASSWORD` | `loadtest123` | Admin test account password |

Test users must be pre-seeded in the target DB. See `docs/load-testing.md`.

## Smoke test (30 s, 2 VUs)

```bash
./scripts/load/smoke.sh

# or with explicit target
BASE_URL=https://api.staging.phperformance.com ./scripts/load/smoke.sh
```

## Individual scenarios

```bash
# Auth flow (login, me, refresh, logout)
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/auth.js

# Athlete portal (programs, bookings, billing)
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/user-portal.js

# Parent/guardian portal
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/parent-portal.js

# Admin dashboard
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/admin.js

# Socket.IO HTTP polling handshake
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/socket-connect.js

# Reconnect storm (mass simultaneous reconnects)
k6 run -e BASE_URL=http://localhost:3000 scripts/load/scenarios/reconnect-storm.js
```

## Full suite (all scenarios, parallel)

```bash
k6 run \
  -e BASE_URL=https://api.staging.phperformance.com \
  -e TEST_USER_EMAIL=loadtest@phperformance.com \
  -e TEST_USER_PASSWORD=... \
  -e ADMIN_TEST_EMAIL=admin-loadtest@phperformance.com \
  -e ADMIN_TEST_PASSWORD=... \
  -e PARENT_TEST_EMAIL=parent-loadtest@phperformance.com \
  -e PARENT_TEST_PASSWORD=... \
  scripts/load/suite.js
```

## Thresholds

| Scenario | p95 | p99 | Error rate |
|---|---|---|---|
| auth | < 500 ms | < 1000 ms | < 1% |
| userPortal | < 800 ms | < 2000 ms | < 1% |
| parentPortal | < 800 ms | < 2000 ms | < 1% |
| admin | < 1000 ms | < 3000 ms | < 1% |
| socketConnect | < 1000 ms | < 3000 ms | < 5% |
| reconnectStorm | < 2000 ms | — | < 5% |

## npm/pnpm aliases (from apps/api)

```bash
pnpm --filter api load:smoke      # 2 VUs, 30 s, auth scenario
pnpm --filter api load:auth       # auth scenario, default LOAD_OPTIONS
pnpm --filter api load:portal     # athlete portal scenario
pnpm --filter api load:admin      # admin scenario
pnpm --filter api load:suite      # full suite
pnpm --filter api load:reconnect  # reconnect storm
```
