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
