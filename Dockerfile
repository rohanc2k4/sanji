FROM node:22-bookworm-slim AS builder

RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/tsconfig.json ./apps/backend/
COPY apps/frontend/package.json apps/frontend/tsconfig.json apps/frontend/tsconfig.node.json apps/frontend/vite.config.ts apps/frontend/index.html ./apps/frontend/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY apps/backend/src ./apps/backend/src
COPY apps/frontend/src ./apps/frontend/src
COPY packages/shared/src ./packages/shared/src

RUN pnpm --filter @sanji/frontend build
RUN pnpm --filter @sanji/backend build

FROM node:22-bookworm-slim AS runtime

RUN corepack enable

WORKDIR /app

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/frontend/dist ./apps/frontend/dist
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

EXPOSE 8080

CMD ["node", "apps/backend/dist/index.js"]
