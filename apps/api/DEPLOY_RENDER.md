# Render deploy (ph-api / ph-api2)

Render Docker builds default to using the repository root as the build context. `apps/api/Dockerfile` expects the build context to be `apps/api`, so it will fail if you point Render at that Dockerfile without changing the build context.

## Option 0 (fastest): use the repo root `Dockerfile`

- **Runtime**: Docker
- **Dockerfile path**: `Dockerfile`
- **Docker build context**: repository root (default)

## Blueprint option (no manual settings)

This repo includes a root `render.yaml`, so you can deploy via a **Render Blueprint** instead of configuring the service manually.

## Option A (recommended): keep repo root build context

- **Runtime**: Docker
- **Dockerfile path**: `apps/api/Dockerfile.render`
- **Docker build context**: repository root (default)

## Option B: build from the API directory

- **Runtime**: Docker
- **Root directory / build context**: `apps/api`
- **Dockerfile path**: `Dockerfile`

## Required env vars

At minimum, production startup validates:

- `NODE_ENV=production`
- `PORT=3001` (Render also sets `PORT`; set this explicitly to match your service)
- `DATABASE_URL`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `STRIPE_WEBHOOK_SECRET`
- `ADMIN_WEB_URL`
- `OPEN_AI_API_KEY`

Optional but commonly needed:

- `RUN_MIGRATIONS_ON_STARTUP=1` (or `true`)
- `DATABASE_SSL=true`
- `CORS_ORIGINS`
- `EXPO_ACCESS_TOKEN`
- AWS/S3/CloudFront + SMTP/Resend vars (as applicable)
