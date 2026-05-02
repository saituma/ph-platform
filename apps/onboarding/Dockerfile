FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/onboarding/package.json ./apps/onboarding/

RUN pnpm install --filter onboarding...

COPY apps/onboarding ./apps/onboarding

ARG VITE_BASE_PATH=/onboarding/
RUN cd apps/onboarding && VITE_BASE_PATH=$VITE_BASE_PATH pnpm build

FROM nginx:1.27-alpine

COPY apps/onboarding/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=base /app/apps/onboarding/dist /usr/share/nginx/html

EXPOSE 80
