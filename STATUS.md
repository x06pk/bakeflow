# Status — 2026-09-29

Current milestone: M4 validado; M5 IN PROGRESS.
Completed: M1–M3 preservados. M4: login integrado, shell responsivo, sidebar recolhível/mobile, light/dark persistente, componentes shadcn/ui, feedback e dialog acessível.
Validation: lint, typecheck e build web aprovados. Smoke Playwright com Edge: login real, refresh após reload, tema, sidebar 80px, mobile 390px sem overflow e logout aprovados. CI M3 success: https://github.com/x06pk/bakeflow/actions/runs/36516671387.
Remaining: M5 catálogo e versões; M6–M14 conforme backlog. Links dos módulos seguintes ainda aguardam implementação; não são entrega V1 concluída.
Known issues: Chromium baixou mas extração travou e foi interrompida; smoke usa E2E_BROWSER=msedge instalado. Cache parcial ignorado em .cache/playwright. Rollup avisa sobre comentários de dependência Zod; build passa.
External blockers: nenhum. Não reinstalar dependências já presentes.
Last successful commit: 72ba218 (M3), sincronizado com origin/main; M4 será commitado neste checkpoint.
Runtime: Docker bakeflow-postgres saudável em localhost:55432, API/web Docker ainda imagem M2. API host PID 16824 em 3000; Vite em 5173, iniciados nesta sessão. API usa CORS_ORIGIN=http://localhost:5173.
Commands: definir COREPACK_HOME=C:/ProjetosIA/projects/bakeflow/.cache/corepack; usar pnpm.cmd. Git requer -c safe.directory=C:/ProjetosIA/projects/bakeflow por mudança de usuário executor, sem alterar configuração global.
Next action: implementar catálogo/receitas na API e web, preservar imutabilidade e paginação backend. Continuar com commits/push por milestone.
