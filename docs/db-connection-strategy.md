# Database Connection Strategy

## Why Connection Pooling Matters

Each PostgreSQL connection consumes ~5–10 MB of RAM on the server and a file descriptor on both sides of the socket. Most hosted Postgres plans (Neon free/launch, Heroku Postgres Mini/Basic) cap total connections at 25–100.

When the API runs on multiple dynos/instances the arithmetic is:

> **Total connections = instances × DB_POOL_MAX**

### Connection count table

| Instances | DB_POOL_MAX | Total connections |
|-----------|-------------|-------------------|
| 1         | 5           | 5                 |
| 2         | 5           | 10                |
| 5         | 5           | 25                |
| 10        | 5           | 50                |

A hardcoded `max: 30` on 5 dynos = 150 connections — enough to exhaust Neon's
free tier (25 connections) or Heroku Postgres Mini (25 connections) instantly.

### Recommended pool size formula

```
DB_POOL_MAX = floor(DB_MAX_CONNECTIONS / (instances × 1.2))
```

The `× 1.2` safety margin reserves headroom for migrations, psql sessions, and
monitoring tools. Example: 100-connection plan, 5 instances → `floor(100 / 6)` = 16.

## Environment Variables

| Variable              | Default (prod) | Default (dev) | Purpose                                      |
|-----------------------|----------------|---------------|----------------------------------------------|
| `DB_POOL_MAX`         | 5              | 10            | Max connections per API instance             |
| `DB_IDLE_TIMEOUT_MS`  | 30000          | 30000         | Idle client recycled after this many ms      |
| `DB_CONNECT_TIMEOUT_MS` | 10000        | 10000         | Fail connection attempt after this many ms   |
| `DATABASE_URL`        | required       | required      | App runtime connection (may be pooler URL)   |
| `DIRECT_DATABASE_URL` | optional       | optional      | Non-pooled URL for migrations only           |

## Neon Pooler Setup

When `DATABASE_URL` ends in `-pooler.neon.tech` the app is using Neon's built-in
pgbouncer in transaction mode. This is the correct setup for a multi-instance API.

1. In the Neon console open your project → **Connection pooling**.
2. Copy the **Pooled connection string** → set as `DATABASE_URL` in production.
3. Copy the **Direct connection string** (no `-pooler` in hostname) → set as
   `DIRECT_DATABASE_URL`.
4. Migrations (`pnpm db:migrate`) will use `DIRECT_DATABASE_URL` automatically.

```
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
DIRECT_DATABASE_URL=postgresql://user:pass@ep-xxx.eu-west-2.aws.neon.tech/neondb?sslmode=require
DB_POOL_MAX=5
```

## Supabase Pooler Setup (Supavisor)

Supabase exposes two ports on the same host:

| Mode        | Port  | Use for        |
|-------------|-------|----------------|
| Transaction | 6543  | App runtime    |
| Session     | 5432  | Migrations     |

```
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:6543/postgres
DIRECT_DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres
DB_POOL_MAX=5
```

## Heroku Postgres (production)

Heroku auto-provisions `DATABASE_URL` as a **direct** (non-pooled) connection.
No `DIRECT_DATABASE_URL` is needed — migrations can use `DATABASE_URL` directly.

### Connection limits by plan

| Plan | Max connections | Safe dynos at DB_POOL_MAX=5 |
|---|---|---|
| Mini | 25 | 5 |
| Basic | 25 | 5 |
| Standard-0 | 25 | 5 |
| Standard-2 | 400 | 80 |
| Premium-0 | 400 | 80 |

### Recommended env vars on Heroku

```bash
# Set via CLI
heroku config:set DB_POOL_MAX=5 --app ph-performance
heroku config:set DB_IDLE_TIMEOUT_MS=30000 --app ph-performance
heroku config:set DB_CONNECT_TIMEOUT_MS=10000 --app ph-performance
# DATABASE_URL is already set by Heroku Postgres — do not override it

# For multi-dyno Socket.IO (requires Heroku Redis add-on)
heroku config:set SOCKET_REQUIRE_REDIS=true --app ph-performance
```

### Adding PgBouncer (optional, for high-dyno counts)

If you run more dynos than the plan allows (e.g., 10 dynos on Standard-0 = 250 connections > 25 limit), add PgBouncer:

```bash
heroku addons:create heroku-pgbouncer --app ph-performance
# Sets DATABASE_URL to the pooler URL and DATABASE_CONNECTION_POOL_URL to the direct URL
# Then set:
heroku config:set DIRECT_DATABASE_URL="$(heroku config:get DATABASE_CONNECTION_POOL_URL --app ph-performance)" --app ph-performance
```

## Migrations: Always Use a Direct Connection

Transaction-mode poolers (pgbouncer, Neon pooler, Supabase Supavisor port 6543)
do not support:

- Advisory locks (`pg_advisory_lock`) — used by Drizzle Kit to prevent concurrent migrations
- Multi-statement DDL inside a pooled transaction
- `SET LOCAL` and `BEGIN … COMMIT` across statement boundaries

Always set `DIRECT_DATABASE_URL` in production so `pnpm db:migrate` bypasses the
pooler.

## API Startup Warning

The API logs a `WARN` at startup when `DB_POOL_MAX > 10` in production:

```
[DB] WARN: DB_POOL_MAX=30 exceeds 10 in production. Total connections = instances × pool_max. ...
```

This is not a crash — it is a nudge to review pool sizing before adding more instances.
