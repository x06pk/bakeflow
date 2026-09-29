# Status — 2026-09-29

Current milestone: M1–M14 DONE. V1 concluída.
Completed: catálogo/receitas versionadas; estoque/FEFO; compras parciais; planejamento/produção atômica; custos/rastreabilidade/perdas; RH; autenticação/RBAC; dashboard/relatórios CSV; interface responsiva light/dark; demo e documentação com screenshots.
Validation: pnpm lint, typecheck, test e build aprovados. 12 testes em 11 arquivos usam PostgreSQL real bakeflow_test e cobrem regras críticas, rollback, concorrência e fluxo HTTP. Dois smokes Playwright/Edge aprovados tanto no Docker operacional quanto em instalação nova: autenticação/refresh/logout/tema e 13 módulos em desktop 1440px/mobile 390px.
Docker: build/up aprovado; API e PostgreSQL saudáveis, GET http://localhost:8080/health retorna 200. Instalação em volume novo bakeflow-verify comprovou migrations e seeds; containers de verificação removidos, volume preservado. Seed determinístico/idempotente validado: 30 insumos, 18 produtos, 270 produções, cinco usuários, três insumos abaixo do mínimo e zero divergências de lotes/movimentos.
Git: privado x06pk/bakeflow, main sincronizada. Nenhuma credencial local encontrada nos arquivos versionados; .env e caches ignorados. Último commit funcional validado: 98b06c0, CI success https://github.com/x06pk/bakeflow/actions/runs/36603543779. Este checkpoint altera apenas documentos de conclusão.
Remaining: nenhum requisito V1 pendente. Não refazer milestones concluídos.
Known issues: avisos não bloqueantes de comentários de dependência Zod no Rollup e runtime de Actions; pipeline aprovado. Smoke local usa Edge instalado. Demo é um retrato da data inicial e não avança ao reexecutar seed, conforme README.
External blockers: nenhum.
Runtime: aplicação Docker localhost:8080; PostgreSQL localhost:55432, banco operacional bakeflow e testes bakeflow_test. API interna ao Compose. Processos auxiliares de desenvolvimento em 3000/5173 não são necessários para executar a entrega.
Commands: pnpm.cmd no PowerShell; COREPACK_HOME=C:/ProjetosIA/projects/bakeflow/.cache/corepack neste workspace. Git exige -c safe.directory=C:/ProjetosIA/projects/bakeflow devido ao proprietário original; nenhuma configuração global alterada.
Next action: utilizar/apresentar a aplicação seguindo README; mudanças futuras devem ter escopo próprio. Confirmar o CI do checkpoint documental após o push.