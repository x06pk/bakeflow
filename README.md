# BakeFlow

Gestão operacional para padarias: da compra de insumos à rastreabilidade do produto acabado. Aplicação Full Stack com estoque auditável, produção transacional e custos históricos, demonstrada com a **Padaria Santa Massa**.

![Dashboard com dados reais da API](docs/screenshots/dashboard.png)

## Funcionalidades

- Estoque por lote, validade, mínimos, ajustes auditados e consumo FEFO sem lotes vencidos.
- Compras com recebimento parcial, saldo pendente e geração automática de lotes.
- Receitas versionadas, planejamento com faltas de matéria-prima e produção com rollback integral.
- Rastreabilidade dos ingredientes ao lote produzido, custos preservados e registro de perdas.
- Funcionários, férias e ausências; administração de usuários com cinco perfis de acesso.
- Dashboard real, relatórios filtrados/paginados, exportação CSV, temas claro/escuro e navegação responsiva.

## Executar com Docker

Requisitos: Git e Docker com Compose. O repositório é privado; o clone requer acesso autorizado.

```sh
git clone https://github.com/x06pk/bakeflow.git
cd bakeflow
cp .env.example .env
docker compose up -d --build
```

No PowerShell, use `Copy-Item .env.example .env`. Acesse **http://localhost:8080**. O primeiro build aplica migrations e cria o ambiente demo automaticamente; não é necessário PostgreSQL instalado no host. Para verificar a inicialização: `docker compose ps` e `docker compose logs api`. Para parar preservando dados: `docker compose down`.

Os valores de `.env.example` são placeholders exclusivamente locais. A senha inicial é o valor de `DEMO_PASSWORD` copiado para `.env`. Configure valores próprios antes de expor um ambiente; HTTPS exige `COOKIE_SECURE=true` e `CORS_ORIGIN` correspondente à URL pública.

### Contas demo

| E-mail | Perfil |
| --- | --- |
| admin@bakeflow.demo | ADMIN — acesso integral |
| gerente@bakeflow.demo | MANAGER — operação e relatórios |
| estoque@bakeflow.demo | STOCK — estoque e compras |
| producao@bakeflow.demo | PRODUCTION — produção e leituras operacionais |
| rh@bakeflow.demo | HR — funcionários, férias e ausências |

Todas usam `DEMO_PASSWORD` na criação. Seeds preservam senhas e dados existentes. `SEED_MODE=minimal` inicializa apenas categorias essenciais e admin; `demo` é o padrão do Compose.

A demo possui 30 insumos, 18 produtos, receitas, fornecedores, funcionários e 270 produções em aproximadamente 90 dias. Inclui estoque baixo, lotes vencidos/próximos do vencimento, compra parcial, pedidos pendentes, perdas, férias e planejamento futuro. É determinística para uma mesma data de referência e idempotente. `DEMO_ANCHOR_DATE=YYYY-MM-DD` fixa a referência antes da primeira execução; reexecutar não avança o histórico existente.

## Stack e arquitetura

**Frontend:** React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS, componentes shadcn/ui, Lucide e Recharts.

**Backend:** Node.js 24, Fastify, Zod, Prisma e PostgreSQL 17. Monorepo pnpm, Docker Compose, Vitest, Playwright e GitHub Actions.

```text
apps/web             Interface, rotas e estado de servidor
apps/api             API /api/v1, autorização e serviços de domínio
packages/database    Prisma, migrations, constraints e seeds
packages/shared      Tipos compartilhados
docker               Imagens e proxy Nginx
e2e                  Smoke de navegador
```

Rotas validam entradas e delegam regras aos serviços. Transações serializáveis, bloqueios e atualizações condicionais protegem saldo e recebimentos concorrentes. Quantidades/custos usam decimais; conversões de unidades são centralizadas. Produções referenciam versões imutáveis da receita e registram o custo de cada lote consumido. Constraints e triggers no PostgreSQL reforçam a integridade e a imutabilidade do histórico.

Autenticação usa Argon2, access token JWT de 15 minutos e refresh token opaco de sete dias em cookie HttpOnly, com rotação/revogação e detecção de replay. RBAC é aplicado no backend. Helmet, CORS, rate limit, validação Zod e erros padronizados complementam a proteção.

Veja [ARCHITECTURE.md](ARCHITECTURE.md) e [DECISIONS.md](DECISIONS.md). Não há folha de pagamento, ponto eletrônico, vendas ou exportação PDF na V1. A demo representa a saída para balcão por movimentações de ajuste identificadas.

## Desenvolvimento local

Requisitos: Node.js 24 e pnpm 10.30.3. No PowerShell, use `pnpm.cmd` se a política local bloquear o wrapper `.ps1`.

1. Copie `.env.example` para `.env` e altere `CORS_ORIGIN` para `http://localhost:5173`.
2. Execute:

```sh
docker compose up -d postgres
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
pnpm db:migrate
pnpm seed:minimal
pnpm seed:demo
pnpm dev
```

Web: http://localhost:5173. API/health: http://localhost:3000/health. PostgreSQL: `127.0.0.1:55432`. O backend carrega `.env` da raiz; variáveis já exportadas têm precedência.

### Variáveis

| Variável | Uso |
| --- | --- |
| POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD | Banco local do Compose |
| DATABASE_URL | Conexão Prisma no host; Compose usa o endereço interno |
| TEST_DATABASE_URL | Banco isolado, obrigatoriamente terminado em `_test` |
| JWT_SECRET | Chave de assinatura, ao menos 32 caracteres |
| DEMO_PASSWORD | Senha inicial demo, ao menos 12 caracteres |
| CORS_ORIGIN | Origem exata do frontend |
| COOKIE_SECURE | `false` local HTTP; `true` com HTTPS |
| SEED_MODE | `demo` ou `minimal`, na inicialização Docker |
| DEMO_ANCHOR_DATE | Data opcional do seed, antes da primeira execução |
| PORT | Porta da API local, padrão 3000 |

## Testes e comandos

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Os testes usam PostgreSQL real e recusam o banco operacional. Prepare uma vez o banco isolado:

```sh
docker compose exec postgres createdb -U bakeflow bakeflow_test
```

Configure `TEST_DATABASE_URL` em `.env`. Aplique migrations e seed mínimo com `DATABASE_URL` temporariamente apontando para esse mesmo banco. Exemplo PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://bakeflow:SENHA_LOCAL@localhost:55432/bakeflow_test?schema=public'
pnpm.cmd db:migrate
pnpm.cmd seed:minimal
Remove-Item Env:DATABASE_URL
pnpm.cmd test
```

A suíte cobre autenticação/RBAC, FEFO, vencimento, insuficiência, rollback, concorrência, receitas imutáveis, custos históricos, recebimento parcial, perdas, integridade de movimentos e um fluxo HTTP completo.

Smoke com a aplicação em execução: `pnpm exec playwright test`. Configure `E2E_URL=http://localhost:8080` para Docker (padrão: Vite em 5173). Use `E2E_BROWSER=msedge` com Edge instalado ou instale Chromium via `pnpm exec playwright install chromium`. Os testes percorrem os módulos em desktop/mobile e verificam login, refresh, tema, navegação e logout. `DEMO_PASSWORD` deve corresponder ao ambiente testado.

O CI prepara PostgreSQL isolado e executa instalação, geração Prisma, migrations, seed mínimo, lint, typecheck, testes e build.

## API

Health: `GET /health`. Prefixo: `/api/v1`. Autenticação: `POST /auth/login`, `/auth/refresh`, `/auth/logout` e `GET /auth/me`. Envie `Authorization: Bearer <accessToken>` nas rotas protegidas; preserve o cookie para refresh/logout.

Recursos: `ingredients`, `products`, `recipes`, `suppliers`, `purchases`, `inventory`, `production`, `losses`, `employees`, `vacations`, `absences`, `users`, `dashboard` e `reports`. As listagens relevantes aceitam `page`, `pageSize`, `search` e filtros do domínio. Detalhes das ações e schemas ficam nas rotas de cada módulo em `apps/api/src/modules`.

Relatórios: `GET /api/v1/reports?kind=production&format=csv`; tipos `stock`, `movements`, `production`, `losses` e `cost`. JSON paginado é o formato padrão. Erros seguem `{ "error": { "code": "...", "message": "...", "details": {} } }`, com status HTTP apropriado.

![Interface em tema escuro](docs/screenshots/dashboard-dark.png)

[Visualização mobile](docs/screenshots/mobile.png).

Estado de entrega e evidências: [STATUS.md](STATUS.md). Milestones: [BACKLOG.md](BACKLOG.md).
