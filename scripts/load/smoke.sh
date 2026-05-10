#!/usr/bin/env bash
# Quick smoke test — 2 VUs, 30 seconds, auth scenario only.
# Validates k6 scripts parse correctly and the API is reachable.
#
# Usage:
#   ./scripts/load/smoke.sh                                      # localhost
#   BASE_URL=https://ph-performance-2cae29f7922d.herokuapp.com ./scripts/load/smoke.sh
#
# Get your Heroku URL:
#   heroku info --app ph-performance | grep "Web URL"
#
# Pre-requisites:
#   - k6 installed (brew install k6 / sudo pacman -S k6)
#   - API running at BASE_URL
#   - Test user seeded (see docs/load-testing.md)
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-loadtest@example.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-loadtest123}"
ADMIN_TEST_EMAIL="${ADMIN_TEST_EMAIL:-admin-loadtest@example.com}"
ADMIN_TEST_PASSWORD="${ADMIN_TEST_PASSWORD:-loadtest123}"
PARENT_TEST_EMAIL="${PARENT_TEST_EMAIL:-parent-loadtest@example.com}"
PARENT_TEST_PASSWORD="${PARENT_TEST_PASSWORD:-loadtest123}"

echo "========================================="
echo "PH Performance API — Smoke Test"
echo "Target: $BASE_URL"
echo "========================================="
echo ""

# Resolve the repo root regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

k6 run \
  -e BASE_URL="$BASE_URL" \
  -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
  -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
  -e ADMIN_TEST_EMAIL="$ADMIN_TEST_EMAIL" \
  -e ADMIN_TEST_PASSWORD="$ADMIN_TEST_PASSWORD" \
  -e PARENT_TEST_EMAIL="$PARENT_TEST_EMAIL" \
  -e PARENT_TEST_PASSWORD="$PARENT_TEST_PASSWORD" \
  -e SMOKE=1 \
  --vus 2 \
  --duration 30s \
  "$REPO_ROOT/scripts/load/scenarios/auth.js"

echo ""
echo "Smoke test complete. Check output above for threshold pass/fail."
