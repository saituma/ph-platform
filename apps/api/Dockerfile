FROM node:20-slim AS build

# Build from the repository root: docker build -f apps/api/Dockerfile .
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.26.0 --activate

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/drizzle.config.ts ./apps/api/
COPY packages/roles/package.json packages/roles/tsconfig.json ./packages/roles/
COPY packages/billing/package.json packages/billing/tsconfig.json ./packages/billing/

RUN pnpm install --filter ./apps/api...

COPY apps/api/src ./apps/api/src
COPY apps/api/drizzle ./apps/api/drizzle
COPY packages/roles/src ./packages/roles/src
COPY packages/billing/src ./packages/billing/src

# Avoid OOM during `tsc` on small CI/Render builders; harmless locally.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm --filter ./apps/api build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable
RUN corepack prepare pnpm@10.26.0 --activate

COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/drizzle /app/apps/api/drizzle
COPY --from=build /app/apps/api/drizzle.config.ts /app/apps/api/drizzle.config.ts
COPY --from=build /app/packages/roles/package.json /app/packages/roles/package.json
COPY --from=build /app/packages/roles/dist /app/packages/roles/dist
COPY --from=build /app/packages/billing/package.json /app/packages/billing/package.json
COPY --from=build /app/packages/billing/dist /app/packages/billing/dist

WORKDIR /app/apps/api

EXPOSE 3001
CMD ["node", "dist/index.js"]
