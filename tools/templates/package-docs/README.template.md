# {{PACKAGE_IMPORT}}

{{ONE_LINE_PURPOSE}}

{{TIER_LINE}}

---

## Quick start

### Installation (within monorepo)

```json
{
  "dependencies": {
    {{WORKSPACE_DEPENDENCY_LINE}}
  }
}
```

### Import strategies

#### Strategy A — Subpath (recommended)

```typescript
{{IMPORT_EXAMPLE_SUBPATH}}
```

**Use when:** {{SUBPATH_USE_WHEN}}

#### Strategy B — Barrel / alternative

{{IMPORT_STRATEGY_B_ALTERNATIVE}}

---

## Public surface (summary)

{{EXPORTS_TABLE_OR_BULLETS}}

Full barrel: `{{BARREL_PATH}}`.

---

## Table inventory (schema modules)

{{TABLE_INVENTORY_SUMMARY}}

{{SCHEMA_BASIS_BREAKDOWN_TABLE}}

**Legacy/new planning policy:** {{LEGACY_AND_NEW_TABLE_POLICY}}

**Table change policy:**

{{TABLE_CHANGE_POLICY_BULLETS}}

---

## Feature guides

{{FEATURE_SECTIONS}}

---

## Local development

{{LOCAL_DEV_SECTION}}

---

## Testing

```bash
{{TEST_COMMANDS}}
```

---

## ADRs (decisions)

{{ADR_LINKS_OR_NONE}}

---

## Related documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Full design, boundary, consumers, governance
{{RELATED_DOCS_BULLETS}}

---

## Stability policy

{{STABILITY_POLICY_BULLETS}}

---

## Checklist (optional)

{{OPTIONAL_CHECKLIST_TABLE}}
