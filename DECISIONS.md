# Decisões

- ADR-001 (2026-09-28): stack solicitada, módulos por domínio, sem packages adicionais. Decimais e transações protegem estoque/custos.
- ADR-002 (2026-09-28): caches locais ao projeto e pnpm.cmd no Windows; não alterar execution policy.
- ADR-003: PostgreSQL local publicado em 127.0.0.1:55432 para evitar colisao com porta 5432 ja ocupada; nenhum outro servico foi alterado.
- ADR-004 (2026-09-29): refresh opaco em cookie HttpOnly com rotação e revogação da família; access token também verifica sessão ativa. Histórico imutável reforçado por triggers PostgreSQL; transações serializáveis têm retry limitado para conflitos concorrentes.
- ADR-005 (2026-09-29): demo determinística por data de referência e idempotente, sem sobrescrever operação existente. Testes usam banco separado com sufixo `_test`; validação Docker do zero usa projeto/volume descartável próprio.
