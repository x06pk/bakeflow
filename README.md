# BakeFlow

Gestão operacional para padarias. Em implementação; acompanhe BACKLOG.md e STATUS.md.

## Desenvolvimento

Node 24 e pnpm. No PowerShell use `pnpm.cmd` se scripts estiverem bloqueados.

```sh
pnpm install
pnpm db:generate
pnpm build
pnpm db:migrate
pnpm seed:minimal
pnpm dev
```

API: http://localhost:3000/health. Web: http://localhost:5173.

## Docker

```sh
cp .env.example .env
docker compose up -d --build
```

Web: http://localhost:8080. PostgreSQL local: 127.0.0.1:55432. Compose aplica migrations e seed mínimo automaticamente. Admin: admin@bakeflow.demo, senha DEMO_PASSWORD do ambiente (mínimo 12 caracteres). As credenciais placeholder são exclusivamente locais; substitua antes de expor qualquer ambiente. O seed preserva usuários existentes.

## Validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

Testes de integração usam banco isolado com sufixo `_test`. Crie-o com `docker compose exec postgres createdb -U bakeflow bakeflow_test`, configure `TEST_DATABASE_URL` e execute migrations/seed mínimo nesse destino (defina `DATABASE_URL` temporariamente com a URL de teste). A configuração Vitest recusa o banco operacional. Smoke de navegador: `node node_modules/@playwright/test/cli.js test`; no Windows com Edge instalado, defina `E2E_BROWSER=msedge`, com API/Vite rodando.

## Ambiente demo

O Compose executa seed demo por padrão; SEED_MODE=minimal cria somente admin/categorias. pnpm seed:demo adiciona a Padaria Santa Massa (30 insumos, 18 produtos, 270 produções em 90 dias). A execução é idempotente e preserva dados existentes. DEMO_ANCHOR_DATE permite fixar a data de referência antes da primeira execução.

Contas exclusivamente demo: admin@bakeflow.demo (ADMIN), gerente@bakeflow.demo (MANAGER), estoque@bakeflow.demo (STOCK), producao@bakeflow.demo (PRODUCTION), rh@bakeflow.demo (HR). Todas usam DEMO_PASSWORD definida no ambiente; usuários existentes mantêm suas senhas.
