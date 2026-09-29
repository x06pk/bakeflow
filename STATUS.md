# Status — 2026-09-28

Current milestone: M2 validado; M3 IN PROGRESS.
Completed: monorepo, React/Vite, Fastify/health, Prisma, Docker/Compose, lint/typecheck/build, smoke e CI configurado. Repositorio privado x06pk/bakeflow confirmado.
Validation: pnpm.cmd install, db:generate, build, lint, typecheck e test aprovados (1 smoke). Docker compose up -d --build aprovado; PostgreSQL/API healthy e web HTTP 200 em localhost:8080. PostgreSQL local isolado na porta 55432 (5432 ocupada, nenhum outro servico alterado).
M2: schema completo, migration aplicada e seed minimo idempotente. Testes de constraints/rollback/imutabilidade aprovados (3 testes totais), lint/typecheck/build aprovados. Startup Docker com migration/seed e health validado. Remaining: M3–M14.
Known issues: usar pnpm.cmd e COREPACK_HOME neste projeto/.cache/corepack. Docker/GitHub requerem ferramentas fora do sandbox. Git elevated requer safe.directory por variavel de processo; nao alterar config pessoal.
External blockers: nenhum atual. CI aguardando primeiro push.
Last successful commit: 9dd4bf9 (M1), enviado para origin/main; CI success https://github.com/x06pk/bakeflow/actions/runs/36514391637.
Next action: autenticação Argon2/JWT, refresh rotativo revogavel e RBAC backend.
