FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @bakeflow/shared --filter @bakeflow/database --filter @bakeflow/api build
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
