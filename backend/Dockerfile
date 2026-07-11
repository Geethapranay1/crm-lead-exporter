FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json ./
COPY shared shared
COPY backend backend
RUN pnpm install --no-frozen-lockfile --filter backend... --filter shared
RUN pnpm --filter shared build
RUN pnpm --filter backend build

FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY pnpm-workspace.yaml package.json ./
COPY shared/package.json shared/package.json
COPY backend/package.json backend/package.json
RUN pnpm install --prod --no-frozen-lockfile --filter backend... --filter shared

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist

EXPOSE 5000
CMD ["node", "backend/dist/index.js"]
