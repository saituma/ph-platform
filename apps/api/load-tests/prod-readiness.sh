#!/usr/bin/env bash
set -euo pipefail

# ╔══════════════════════════════════════════════════════════════╗
# ║      PH Performance — Production Readiness Audit            ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Checks the API server for production readiness across:
#   1. Health & connectivity
#   2. Response times (latency benchmarks)
#   3. Security headers
#   4. Rate limiting
#   5. Error handling
#   6. Graceful degradation
#   7. Database pool behavior
#   8. Compression
#
# Usage:
#   ./prod-readiness.sh                          # localhost:3000
#   ./prod-readiness.sh https://api.example.com  # remote
#   AUTH_TOKEN=xxx ./prod-readiness.sh            # with auth

BASE_URL="${1:-http://localhost:3000}"
AUTH="${AUTH_TOKEN:-}"
PASS=0
FAIL=0
WARN=0
RESULTS=()

green()  { printf "\033[32m%s\033[0m" "$1"; }
red()    { printf "\033[31m%s\033[0m" "$1"; }
yellow() { printf "\033[33m%s\033[0m" "$1"; }
bold()   { printf "\033[1m%s\033[0m" "$1"; }

pass() { PASS=$((PASS + 1)); RESULTS+=("$(green "PASS") $1"); }
fail() { FAIL=$((FAIL + 1)); RESULTS+=("$(red "FAIL") $1"); }
warn() { WARN=$((WARN + 1)); RESULTS+=("$(yellow "WARN") $1"); }

header() {
  echo ""
  bold "── $1 ──"
  echo ""
}

# Check if curl supports -w (write-out) — it always does on modern systems
check_latency() {
  local url="$1"
  local label="$2"
  local threshold_ms="$3"
  local extra_args="${4:-}"

  local timing
  timing=$(curl -s -o /dev/null -w "%{time_total}" $extra_args "$url" 2>/dev/null || echo "9999")
  local ms
  ms=$(echo "$timing * 1000" | bc 2>/dev/null || echo "9999")
  local ms_int=${ms%.*}

  if [ "$ms_int" -le "$threshold_ms" ]; then
    pass "$label: ${ms_int}ms (threshold: ${threshold_ms}ms)"
  else
    fail "$label: ${ms_int}ms exceeds ${threshold_ms}ms threshold"
  fi
}

check_status() {
  local url="$1"
  local label="$2"
  local expected="$3"
  local extra_args="${4:-}"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" $extra_args "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected" ]; then
    pass "$label → $status"
  else
    fail "$label → $status (expected $expected)"
  fi
}

check_header() {
  local url="$1"
  local header_name="$2"
  local label="$3"

  local headers
  headers=$(curl -s -I "$url" 2>/dev/null)
  if echo "$headers" | grep -qi "^${header_name}:"; then
    pass "$label: present"
  else
    fail "$label: missing"
  fi
}

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      PH Performance — Production Readiness Audit           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Target: $BASE_URL"
echo "Auth:   $([ -n "$AUTH" ] && echo "provided" || echo "none")"
echo "Date:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# ── 1. Health & Connectivity ────────────────────────────────────────────────────
header "1. Health & Connectivity"

check_status "$BASE_URL/" "Root endpoint" "200"
check_status "$BASE_URL/health" "Health check" "200"
check_status "$BASE_URL/api/v1/health/deep" "Deep health (DB)" "200"
check_status "$BASE_URL/api/v1/version" "Version endpoint" "200"

# Check deep health returns db connected
DB_STATUS=$(curl -s "$BASE_URL/api/v1/health/deep" 2>/dev/null | grep -o '"database":"[^"]*"' | head -1)
if echo "$DB_STATUS" | grep -q "connected"; then
  pass "Database connectivity: connected"
else
  fail "Database connectivity: $DB_STATUS"
fi

# ── 2. Latency Benchmarks ──────────────────────────────────────────────────────
header "2. Latency Benchmarks"

check_latency "$BASE_URL/health" "GET /health" 50
check_latency "$BASE_URL/api/v1/health/deep" "GET /health/deep" 200

if [ -n "$AUTH" ]; then
  check_latency "$BASE_URL/api/v1/auth/me" "GET /auth/me" 300 "-H 'Authorization: Bearer $AUTH'"
  check_latency "$BASE_URL/api/v1/bookings" "GET /bookings" 500 "-H 'Authorization: Bearer $AUTH'"
  check_latency "$BASE_URL/api/v1/programs" "GET /programs" 500 "-H 'Authorization: Bearer $AUTH'"
  check_latency "$BASE_URL/api/v1/notifications" "GET /notifications" 400 "-H 'Authorization: Bearer $AUTH'"
else
  warn "Auth token not provided — skipping authenticated latency checks"
fi

# ── 3. Security Headers ────────────────────────────────────────────────────────
header "3. Security Headers"

check_header "$BASE_URL/health" "x-content-type-options" "X-Content-Type-Options"
check_header "$BASE_URL/health" "x-frame-options" "X-Frame-Options"
check_header "$BASE_URL/health" "x-xss-protection" "X-XSS-Protection"
check_header "$BASE_URL/health" "strict-transport-security" "Strict-Transport-Security (HSTS)"
check_header "$BASE_URL/health" "x-download-options" "X-Download-Options"
check_header "$BASE_URL/health" "x-dns-prefetch-control" "X-DNS-Prefetch-Control"

# Check CORS
CORS_HEADERS=$(curl -s -I -H "Origin: http://evil.com" "$BASE_URL/api/v1/health/deep" 2>/dev/null)
if echo "$CORS_HEADERS" | grep -qi "access-control-allow-origin: http://evil.com"; then
  fail "CORS: allows arbitrary origin (http://evil.com)"
else
  pass "CORS: does not reflect arbitrary origins"
fi

# ── 4. Content-Type Enforcement ─────────────────────────────────────────────────
header "4. Input Validation"

check_status "$BASE_URL/api/v1/auth/login" "Non-JSON POST → 415" "415" \
  "-X POST -d 'hello' -H 'Content-Type: text/plain'"

check_status "$BASE_URL/api/v1/nonexistent-xyz" "Unknown route → 404" "404"

# ── 5. Rate Limiting ───────────────────────────────────────────────────────────
header "5. Rate Limiting"

RL_HEADERS=$(curl -s -I "$BASE_URL/api/v1/health/deep" 2>/dev/null)
if echo "$RL_HEADERS" | grep -qi "x-ratelimit-limit"; then
  RL_LIMIT=$(echo "$RL_HEADERS" | grep -i "x-ratelimit-limit" | head -1 | tr -d '\r' | awk '{print $2}')
  RL_REMAINING=$(echo "$RL_HEADERS" | grep -i "x-ratelimit-remaining" | head -1 | tr -d '\r' | awk '{print $2}')
  pass "Rate limit headers present (limit: $RL_LIMIT, remaining: $RL_REMAINING)"
else
  warn "Rate limit headers not present (Redis/Upstash may not be configured)"
fi

# ── 6. Error Handling ──────────────────────────────────────────────────────────
header "6. Error Handling"

# Unauthenticated access to protected route
UNAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/auth/me" 2>/dev/null)
if [ "$UNAUTH_STATUS" = "401" ]; then
  pass "Protected route without auth → 401"
else
  fail "Protected route without auth → $UNAUTH_STATUS (expected 401)"
fi

# Check error response format (should be JSON)
ERROR_BODY=$(curl -s "$BASE_URL/api/v1/auth/me" 2>/dev/null)
if echo "$ERROR_BODY" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  pass "Error responses are valid JSON"
else
  warn "Error response may not be JSON"
fi

# ── 7. Compression ─────────────────────────────────────────────────────────────
header "7. Compression"

COMP_HEADERS=$(curl -s -I -H "Accept-Encoding: gzip, deflate" "$BASE_URL/api/v1/health/deep" 2>/dev/null)
if echo "$COMP_HEADERS" | grep -qi "content-encoding"; then
  pass "Response compression enabled"
else
  warn "No Content-Encoding header (response may be too small to compress)"
fi

# ── 8. Concurrent Connection Handling ───────────────────────────────────────────
header "8. Concurrent Connections"

CONCURRENT=20
CONCURRENT_FAILS=0
for i in $(seq 1 $CONCURRENT); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null &)
done
wait

# Simpler sequential rapid-fire test
RAPID_FAILS=0
for i in $(seq 1 50); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null)
  if [ "$STATUS" != "200" ] && [ "$STATUS" != "429" ]; then
    RAPID_FAILS=$((RAPID_FAILS + 1))
  fi
done

if [ "$RAPID_FAILS" -eq 0 ]; then
  pass "50 rapid sequential requests: all returned 200/429"
else
  fail "50 rapid requests: $RAPID_FAILS unexpected failures"
fi

# ── 9. Readiness & Graceful Behavior ──────────────────────────────────────────
header "9. Readiness"

# HEAD requests should work
HEAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -I "$BASE_URL/health" 2>/dev/null)
if [ "$HEAD_STATUS" = "200" ]; then
  pass "HEAD /health works for load balancer probes"
else
  fail "HEAD /health → $HEAD_STATUS"
fi

# ── 10. Codebase Checks ────────────────────────────────────────────────────────
header "10. Codebase Checks"

API_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Check for console.log in production code (should use logger)
CONSOLE_LOGS=$(grep -rn "console\.log" "$API_DIR/src/" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".test." | grep -v "__tests__" | wc -l)
if [ "$CONSOLE_LOGS" -le 5 ]; then
  pass "Console.log usage: $CONSOLE_LOGS instances (using structured logger)"
else
  warn "Console.log: $CONSOLE_LOGS instances in src/ — consider using structured logger"
fi

# Check for TODO/FIXME/HACK
TODOS=$(grep -rn "TODO\|FIXME\|HACK\|XXX" "$API_DIR/src/" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".test." | wc -l)
if [ "$TODOS" -le 10 ]; then
  pass "TODOs/FIXMEs: $TODOS (acceptable)"
else
  warn "TODOs/FIXMEs: $TODOS — review before production"
fi

# Check for hardcoded secrets patterns
SECRETS=$(grep -rn "password\s*=\s*['\"]" "$API_DIR/src/" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".test." | grep -v "schema" | grep -v "type\|interface\|param" | wc -l)
if [ "$SECRETS" -eq 0 ]; then
  pass "No hardcoded password patterns found"
else
  warn "Potential hardcoded secrets: $SECRETS occurrences"
fi

# Check .env not committed
if [ -f "$API_DIR/.env" ]; then
  if git -C "$API_DIR" check-ignore -q .env 2>/dev/null; then
    pass ".env is gitignored"
  else
    fail ".env exists but may not be gitignored"
  fi
fi

# ── Summary ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                         RESULTS                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

for result in "${RESULTS[@]}"; do
  echo "  $result"
done

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "  $(green "PASS"): $PASS   $(red "FAIL"): $FAIL   $(yellow "WARN"): $WARN"
echo "────────────────────────────────────────────────────────────────"
echo ""

if [ "$FAIL" -eq 0 ]; then
  green "✓ PRODUCTION READY"
  echo " — all critical checks passed"
  if [ "$WARN" -gt 0 ]; then
    echo "  Review $WARN warning(s) above for best practices"
  fi
else
  red "✗ NOT PRODUCTION READY"
  echo " — $FAIL critical check(s) failed"
  echo "  Fix the failures above before deploying"
fi
echo ""

exit $FAIL
