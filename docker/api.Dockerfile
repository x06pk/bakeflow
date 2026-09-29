FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @bakeflow/shared --filter @bakeflow/database --filter @bakeflow/api build
EXPOSE 3000
CMD ["sh", "-c", "node scripts/database.mjs migrate && node scripts/database.mjs minimal && node scripts/database.mjs ${SEED_MODE:-demo} && node apps/api/dist/server.js"]
