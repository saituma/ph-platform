FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/tsconfig.json ./apps/web/

RUN pnpm install --filter web...

COPY apps/web/app ./apps/web/app
COPY apps/web/components ./apps/web/components
COPY apps/web/lib ./apps/web/lib
COPY apps/web/public ./apps/web/public
COPY apps/web/next.config.ts ./apps/web/next.config.ts
COPY apps/web/postcss.config.mjs ./apps/web/postcss.config.mjs
COPY apps/web/eslint.config.mjs ./apps/web/eslint.config.mjs

RUN pnpm --filter web build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/apps/web/package.json ./apps/web/package.json
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/next.config.ts ./apps/web/next.config.ts

ENV NODE_ENV=production
WORKDIR /app/apps/web

CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
