# Load Tests

## Prerequisites

Install k6: https://k6.io/docs/get-started/installation/

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Running Tests

```bash
# Smoke test (quick sanity)
k6 run load-tests/smoke.js

# Stress test (find limits)
k6 run load-tests/stress.js

# Auth flow under load
k6 run load-tests/auth-flow.js

# Against staging
k6 run -e BASE_URL=https://ph-platform-onboarding-staging.vercel.app load-tests/smoke.js
```

## Thresholds

| Test | p95 Target | Error Rate |
|------|-----------|------------|
| Smoke | <500ms | <1% |
| Stress | <2000ms | <5% |
| Auth | <1000ms | <10% |

## When to Run

- Before production deploys (smoke)
- After infrastructure changes (stress)
- After auth/rate-limit changes (auth-flow)
