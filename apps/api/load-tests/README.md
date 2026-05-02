# API Load Tests

## Install k6

```bash
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

## Run

```bash
# Smoke test only (no auth)
k6 run --env BASE_URL=http://localhost:3000 baseline.js

# Full suite with auth
k6 run \
  --env BASE_URL=http://localhost:3000 \
  --env AUTH_TOKEN=your-jwt-token \
  baseline.js

# Single scenario
k6 run --env BASE_URL=http://localhost:3000 --scenario smoke baseline.js
```

## Expected Baselines

| Endpoint         | p95 Target | Notes                    |
| ---------------- | ---------- | ------------------------ |
| GET /health      | < 50ms     | No DB, no auth           |
| GET /health/deep | < 200ms    | DB connection probe      |
| GET /api/auth/me | < 300ms    | JWT verify + DB lookup   |
| GET /api/bookings| < 500ms    | Auth + query + cache hit |

## Rate Limits

The API enforces 300 req/min per IP on general endpoints. The smoke and load scenarios include a 1s sleep per iteration to stay under limits. The stress scenario (100 VUs) will intentionally exceed limits to verify rate limiting works correctly.
