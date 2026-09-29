# Status — 2026-09-29

Current milestone: M6 validado; M7 IN PROGRESS.
Completed: M1–M3 preservados. M4: login integrado, shell responsivo, sidebar recolhível/mobile, light/dark persistente, componentes shadcn/ui, feedback e dialog acessível.
Validation: lint, typecheck e build web aprovados. Smoke Playwright com Edge: login real, refresh após reload, tema, sidebar 80px, mobile 390px sem overflow e logout aprovados. CI M3 success: https://github.com/x06pk/bakeflow/actions/runs/36516671387.
M5: catálogo e detalhes, categorias separadas, receitas/versionamento, paginação/busca backend, unidades seguras. Lint/typecheck/build, 5 testes Vitest e smoke Edge aprovados. Banco bakeflow_test criado e migrado, isolado da operação. M6: saldos físicos/utilizáveis, mínimos, lotes/validade, ajustes atômicos/auditoria, movimentos imutáveis e alocação FEFO. Lint/typecheck/build e 6 testes aprovados. CI M5 success. Remaining: M7–M14. Links dos módulos seguintes ainda aguardam implementação; não são entrega V1 concluída.
Known issues: Chromium baixou mas extração travou e foi interrompida; smoke usa E2E_BROWSER=msedge instalado. Cache parcial ignorado em .cache/playwright. Rollup avisa sobre comentários de dependência Zod; build passa.
External blockers: nenhum. Não reinstalar dependências já presentes.
Last successful commit: 8842ec4 (M5), sincronizado com origin/main.
Runtime: Docker bakeflow-postgres saudável em localhost:55432, API/web Docker ainda imagem M2. API host PID 16824 em 3000; Vite em 5173, iniciados nesta sessão. API usa CORS_ORIGIN=http://localhost:5173.
Commands: definir COREPACK_HOME=C:/ProjetosIA/projects/bakeflow/.cache/corepack; usar pnpm.cmd. Git requer -c safe.directory=C:/ProjetosIA/projects/bakeflow por mudança de usuário executor, sem alterar configuração global.
Next action: M7 fornecedores, compras, recebimentos parciais e lotes/movimentos. API host agora --watch PID 24696.
