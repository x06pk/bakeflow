# Critérios verificáveis

- R1: install/lint/typecheck/build, health e Compose do zero.
- R2: schema completo, migrations, seeds, constraints de exclusividade e saldo.
- R3: login/me/refresh/logout, Argon2, rotação/revogação e RBAC backend.
- R4: catálogo paginado/filtrado, categorias separadas, unidades seguras, receitas versionadas imutáveis.
- R5: lotes, movimentos auditáveis, ajustes, mínimo e validade.
- R6: recebimento parcial atômico gera lote/movimento; excesso bloqueado.
- R7: planejamento calcula faltas; produção FEFO exclui vencidos; insuficiência/falha faz rollback; custos históricos e rastreabilidade.
- R8: perdas baixam saldo com movimento/custo; excesso bloqueado.
- R9: funcionários, férias e ausências completos.
- R10: dashboard real, gráficos/alertas; relatórios estoque/movimentos/produção/perdas/custo com filtros e CSV.
- R11: identidade cobre/grafite, light/dark, sidebar/drawer, loading/empty/error/success/unauthorized e responsividade.
- R12: demo determinística ~90 dias, 15–20 produtos, 25–35 insumos, receitas/compras/produção; 3 mínimos, 2 vencendo, 1 vencido, compra parcial/pendentes, produção hoje, plano futuro, férias, perdas no mês e 5 roles demo.
- R13: README reproduzível, ambiente documentado, nenhum secret, CI verde, remoto privado main sincronizado.
