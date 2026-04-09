#!/usr/bin/env bash
set -euo pipefail

# Smoke-test migrations against a fresh Postgres, and re-run to ensure idempotence.
#
# Requirements: docker, pnpm
#
# Usage:
#   cd apps/api
#   bash scripts/migration-smoke.sh

PORT="${PORT:-54321}"
CONTAINER_NAME="ph-app-migrations-smoke"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup

echo "[smoke] starting postgres container..."
docker run -d --rm \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -p "127.0.0.1:${PORT}:5432" \
  postgres:16-alpine >/dev/null

echo "[smoke] waiting for postgres..."
for _ in $(seq 1 40); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

export DATABASE_URL="postgres://postgres:${POSTGRES_PASSWORD}@127.0.0.1:${PORT}/postgres"

echo "[smoke] running migrations (1st pass)..."
pnpm db:migrate

echo "[smoke] running migrations (2nd pass, idempotence)..."
pnpm db:migrate

echo "[smoke] ok"

