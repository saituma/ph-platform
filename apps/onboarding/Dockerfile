FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/onboarding/package.json ./apps/onboarding/

RUN pnpm install --filter onboarding...

COPY apps/onboarding ./apps/onboarding

ARG VITE_BASE_PATH=/onboarding/
RUN cd apps/onboarding && NITRO_PRESET=node-server VITE_BASE_PATH=$VITE_BASE_PATH pnpm build

FROM node:20-alpine
WORKDIR /app/apps/onboarding

COPY --from=base /app/apps/onboarding/.output ./.output

EXPOSE 3002
CMD ["node", ".output/server/index.mjs"]
