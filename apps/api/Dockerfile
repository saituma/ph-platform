FROM node:20-slim AS build

WORKDIR /app

COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY drizzle.config.ts drizzle.config.ts
COPY src src
COPY drizzle drizzle

RUN npm install
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/drizzle /app/drizzle
COPY --from=build /app/drizzle.config.ts /app/drizzle.config.ts

EXPOSE 3001
CMD ["npm", "start"]
