# Status — 2026-09-29

Current milestone: M13 concluído; M14 IN PROGRESS.
Completed: M1–M12 preservados; M13 acrescenta fluxo HTTP completo, smoke de todos os módulos desktop/mobile, proteção de rotas na UI, configurações reais, lazy loading e validação decimal. Concorrência de alteração de unidades protegida; .env carregado antes da inicialização do banco, independente do diretório atual.
Validation: pnpm lint/typecheck/test/build aprovados; 12 testes em 11 arquivos (PostgreSQL real isolado bakeflow_test). Dois testes Playwright/Edge aprovados contra Docker em localhost:8080: autenticação/refresh/logout/tema/sidebar e 13 módulos em 1440/390px. Docker Compose build/up saudável. Inicialização Node pela raiz e GET /health: 200. Seed demo: 30 insumos, 18 produtos, 270 produções, zero divergências entre lotes e movimentos.
M14: README final e três screenshots reais adicionados. Instalação em volume novo bakeflow-verify validou migrations, seed (30 insumos/18 produtos/270 produções), zero divergências de saldo e dois smokes Playwright. Data de referência opcional encaminhada pelo Compose; seed aceita variável vazia. Lint/typecheck aprovados após ajustes finais.
Remaining: confirmar atualização final do Docker e CI do commit M14.
Known issues: avisos não bloqueantes de comentários Zod no Rollup. Chromium local não instalado; smoke usa Edge disponível.
External blockers: nenhum.
Last successful commit: 60c90b1 (M13), enviado a origin/main; CI success: https://github.com/x06pk/bakeflow/actions/runs/36602843395.
Runtime: Docker web localhost:8080, API interna, PostgreSQL localhost:55432. Banco operacional bakeflow; testes exclusivamente bakeflow_test. Processos de desenvolvimento podem estar ativos em 3000/5173; não necessários para Docker.
Commands: pnpm.cmd no PowerShell; COREPACK_HOME=C:/ProjetosIA/projects/bakeflow/.cache/corepack. Git: -c safe.directory=C:/ProjetosIA/projects/bakeflow devido ao proprietário original, sem alterar configuração global.
Next action: concluir M14 e verificar main sincronizada/CI verde.