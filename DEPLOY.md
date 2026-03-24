# Deployment Guide — Render + Neon + Vercel + QStash

Free stack for 2-month beta. Total cost: $0.

## Architecture

```
Mobile App → Render (Express API + Socket.io)  ← QStash keep-alive every 14min
Web Admin  → Vercel (Next.js — zero config)
Database   → Neon (PostgreSQL free tier)
CDN/DNS    → Cloudflare (optional, free)
```

---

## Step 1: Neon PostgreSQL (free database)

1. Sign up at https://neon.tech (GitHub login works)
2. Create a project → pick **Frankfurt (eu-central-1)** region
3. Copy the connection string — looks like:
   ```
   postgresql://user:pass@ep-something.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this — you'll use it as `DATABASE_URL`

---

## Step 2: Migrate your database

From your local machine, point at Neon and run migrations:

```bash
cd apps/api
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" \
DATABASE_SSL=true \
npx drizzle-kit push
```

If you need to seed data, also run:
```bash
DATABASE_URL="..." npm run db:seed
```

---

## Step 3: Deploy API to Render

1. Sign up at https://render.com (GitHub login)
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Name**: `ph-api`
   - **Root directory**: `apps/api`
   - **Runtime**: Docker
   - **Instance type**: Free
   - **Region**: Frankfurt (EU)
5. Add environment variables (Dashboard → Environment):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `DATABASE_URL` | Your Neon connection string |
   | `DATABASE_SSL` | `true` |
   | `JWT_SECRET` | (copy from your current Fly.io secrets) |
   | `STRIPE_SECRET_KEY` | (copy from Fly.io) |
   | `STRIPE_PUBLISHABLE_KEY` | (copy from Fly.io) |
   | `STRIPE_SUCCESS_URL` | Your success URL |
   | `STRIPE_CANCEL_URL` | Your cancel URL |
   | `STRIPE_WEBHOOK_SECRET` | (copy from Fly.io) |
   | `ADMIN_WEB_URL` | `https://your-app.vercel.app` |
   | `OPEN_AI_API_KEY` | (copy from Fly.io) |
   | `CORS_ORIGINS` | `https://your-app.vercel.app` |
   | `EXPO_ACCESS_TOKEN` | (copy from Fly.io) |
   | `S3_BUCKET` | (copy from Fly.io) |
   | `AWS_REGION` | (copy from Fly.io) |
   | `CLOUDFRONT_DOMAIN` | (copy from Fly.io) |
   | `SMTP_HOST` | (copy from Fly.io) |
   | `SMTP_PORT` | (copy from Fly.io) |
   | `SMTP_USER` | (copy from Fly.io) |
   | `SMTP_PASS` | (copy from Fly.io) |
   | `SMTP_FROM` | (copy from Fly.io) |
   | `AUTH_MODE` | `jwt` |

6. Click **Deploy**. Render will build from your Dockerfile.

Your API URL will be: `https://ph-api.onrender.com`

---

## Step 4: QStash Keep-Alive (prevent Render sleep)

1. Sign up at https://upstash.com (free)
2. Go to **QStash** → **Schedules**
3. Create a schedule:
   - **URL**: `https://ph-api.onrender.com/api/health`
   - **Method**: GET
   - **Schedule**: `*/14 * * * *` (every 14 minutes)
4. Done. Your server will never sleep.

Free tier: 500 messages/day. This uses ~103/day.

---

## Step 5: Deploy Web Admin to Vercel (free)

Vercel is the simplest option — zero config for Next.js, API routes work
out of the box.

1. Sign up at https://vercel.com (GitHub login)
2. Click **Add New → Project** → import your repo
3. Settings:
   - **Root directory**: `apps/web`
   - **Framework**: Next.js (auto-detected)
4. Environment variables:
   - `API_BASE_URL` = `https://ph-api.onrender.com`
   - `NEXT_PUBLIC_API_BASE_URL` = `https://ph-api.onrender.com/api`
   - `NEXT_PUBLIC_SOCKET_URL` = `https://ph-api.onrender.com`
5. Click **Deploy**

Your web admin URL: `https://your-app.vercel.app`

> **Alternative: Cloudflare Pages** — If you prefer Cloudflare, you need
> the `@opennextjs/cloudflare` adapter since the web admin uses Next.js
> API routes for auth/proxy. More setup required.

---

## Step 6: Update Mobile App

Update your mobile `.env` to point at Render:

```
EXPO_PUBLIC_API_BASE_URL=https://ph-api.onrender.com/api
```

Rebuild with `eas build` or `expo start`.

---

## Step 7: Update Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Update the endpoint URL to: `https://ph-api.onrender.com/api/billing/webhook`

---

## Copying Fly.io Secrets

To get your current secrets from Fly.io:
```bash
cd apps/api
flyctl secrets list
```

Note: Fly.io doesn't show secret values. If you don't have them saved
locally, check your `.env` file or password manager.

---

## Costs

| Service | Free tier | Your usage |
|---------|-----------|------------|
| Render | 750 hrs/month | ~744 hrs (24/7) |
| Neon | 0.5 GB, always free | Database |
| Vercel | 100 GB bandwidth | Web admin |
| QStash | 500 msg/day | ~103 msg/day |
| **Total** | | **$0/month** |

---

## After 2 Months

When you're ready to scale:
- Render paid ($7/month) removes sleep + gives more RAM
- Or migrate to EC2/Railway/Fly.io with proper billing
- Neon free tier stays free forever up to 0.5 GB
