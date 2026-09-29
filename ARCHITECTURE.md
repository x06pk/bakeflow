# Arquitetura

Monorepo pnpm/TypeScript: apps/web (React/Vite/Router/Query/RHF/Zod/Tailwind/shadcn/Lucide/Recharts), apps/api (Fastify/Zod/Prisma), packages/database e packages/shared.

Route/controller → service → repository → PostgreSQL. API /api/v1, health /health. Services concentram regras. Transações e bloqueio concorrente protegem saldos; decimais para quantidades/custos. Movimentos históricos imutáveis; lotes exclusivamente insumo ou produto. Produção fixa versão e custos consumidos, usa FEFO sem vencidos e rollback integral na falta.

Argon2, JWT 15 min, refresh revogável/rotativo 7 dias; RBAC backend ADMIN/MANAGER/STOCK/PRODUCTION/HR. Helmet/CORS/rate limit, erros padronizados e logs sem secrets.

Docker Compose web/Nginx, API/Node, PostgreSQL com healthchecks. Vitest para regras críticas; Actions install/lint/typecheck/test/build.
