# Scripts de infraestructura

Scripts versionados de operación (5.1 §1):

- **deploy** — aplica migraciones (`infra/migrations/`) antes de habilitar tráfico.
- **restore-drill** — simulacro de restauración de backup (NFR-R2, RTO ≤ 4 h); se ejecuta y
  documenta ≥ 1 vez antes de la entrega (evidencia de primera clase para la tesis).
- **warm-up** — golpea `/ready` antes de la demo para matar el cold start del free tier (NFR-D5).

> Estado: se agregan cuando cada uno tenga sustento (deploy en Etapa 1; restore-drill y
> warm-up en Etapa 4 / runbook de demo 4.1 §5).
