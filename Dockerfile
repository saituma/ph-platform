FROM node:20 AS base
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.26.0 --activate

# Install dependencies (monorepo root context)
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/drizzle.config.ts ./apps/api/

RUN pnpm install --filter ./apps/api...

# Build
COPY apps/api/src ./apps/api/src
COPY apps/api/drizzle ./apps/api/drizzle

RUN pnpm --filter ./apps/api build

FROM node:20
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --from=base /app/apps/api/package.json ./apps/api/package.json
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=base /app/apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts

WORKDIR /app/apps/api

EXPOSE 3001
CMD ["sh", "-c", "node dist/scripts/run-migrations.js && node dist/index.js"]
