# BakeFlow

Gestão operacional para padarias. Em implementação; acompanhe BACKLOG.md e STATUS.md.

## Desenvolvimento

Node 24 e pnpm. No PowerShell use `pnpm.cmd` se scripts estiverem bloqueados.

```sh
pnpm install
pnpm db:generate
pnpm build
pnpm dev
```

API: http://localhost:3000/health. Web: http://localhost:5173.

## Docker

```sh
cp .env.example .env
docker compose up -d --build
```

Web: http://localhost:8080. As credenciais placeholder são exclusivamente locais; substitua antes de expor qualquer ambiente. Migrations e seed serão adicionados no M2.

## Validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
