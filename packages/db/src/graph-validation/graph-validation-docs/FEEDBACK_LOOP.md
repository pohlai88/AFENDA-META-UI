# Reality → policy → reality (feedback loop)

1. **Offline:** `graph-validation` produces `validation-report.json` and adjunct metadata.
2. **Runtime:** `*Guarded` reads consult `GRAPH_VALIDATION_POLICY_JSON`; `emitGuardEvent` / `setGraphGuardrailTelemetrySink` forward decisions to structured logs (wire **Pino** in apps per `.agents/skills/pino-logging-setup/SKILL.md`).
3. **Review:** On a fixed cadence, aggregate guard outcomes (block vs allow, stale, severity) and validation trends (orphans, tenant checks).
4. **Tune:** Adjust `deriveGraphValidationPolicy` thresholds, Squawk allowlists, FK baselines, and `CI_GRAPH_ADJUNCTS_STRICT` only after review—avoid silent loosening.

This closes the loop between production behavior and the truth pipeline without running graph scans on the request path.
