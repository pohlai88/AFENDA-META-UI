# Phase 4 — Semantic retrieval & auto-categorization (KPI-gated)

Design placeholder aligned with the **Business Truth Storage Engine** north-star (months 10–12). **Not implemented in code** until KPI gates approve experimentation.

## Goals

- Hybrid search: structured filters (tenant, `truth_resolution_state`, `documentClass`, date) + semantic relevance over extracted text / embeddings.
- Tenant-safe ranking: no cross-tenant leakage; optional per-tenant embedding indexes.
- Auto-categorization: invoice / contract / HR routing with confidence; human review when below threshold.

## Rollout gates (from plan)

- Duplicate-invoice prevention and decision-retrieval baselines stable (false-block rate within threshold).
- Budget per tenant for embedding + index storage (lifecycle tiering).
- Shadow mode: semantic rank alongside metadata-only rank; measure decision latency and click-through on “correct” document.

## API sketch (future)

- `POST /api/truth/query` — business-intent query + filters → ranked evidence bundles (attachment id, lineage, latest `document_truth_decisions` row).
- Reuse `decisionRetrieval.ts` patterns; add vector store adapter behind interface.

## KPIs

- Mean time to answer business-intent query.
- % queries resolved in top-1 vs top-3.
- Cost per 1k queries vs retrieval latency SLO.
