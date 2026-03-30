# {{PACKAGE_TITLE}} — Architecture

> **Status:** {{STATUS_LINE}}
> **Import path:** `{{PACKAGE_IMPORT}}`
> **Tests:** {{TESTS_LINE}}
> **Runtime deps:** {{DEPS_LINE}}

---

## Design philosophy

| Old approach | New approach |
| ------------ | ------------ |
{{PHILOSOPHY_ROWS}}

---

## {{MODULE_OR_PACKAGE}} role

{{ROLE_PARAGRAPH}}

- **Upstream consumers:** {{UPSTREAM_CONSUMERS}}
- **Downstream:** {{DOWNSTREAM_SYSTEMS}}
- **Boundary:** {{BOUNDARY_RULES}}

### Boundary position

```
{{ASCII_BOUNDARY_DIAGRAM}}
```

---

## {{STRUCTURE_HEADING}}

```
{{STRUCTURE_TREE}}
```

---

## Core architecture

### 1. {{PRIMARY_PATTERN_HEADING}}

{{PRIMARY_PATTERN_BODY}}

### 2. {{SECOND_ARCH_HEADING}}

{{SECOND_ARCH_BODY}}

{{OPTIONAL_EXTRA_ARCH_SECTIONS}}

---

## Design patterns

{{DESIGN_PATTERNS_SECTION}}

---

## Consumer map

{{CONSUMER_MAP_SECTION}}

---

## Testing strategy

{{TESTING_STRATEGY_SECTION}}

---

## Build and typecheck

```bash
{{BUILD_COMMANDS}}
```

---

## Governance rules

{{GOVERNANCE_NUMBERED_LIST}}

---

## Import strategy

```typescript
{{IMPORT_STRATEGY_CODE_EXAMPLE}}
```

{{IMPORT_STRATEGY_PROSE}}

---

## Summary

{{CLOSING_SUMMARY_PARAGRAPH}}

**Related:** [README.md](./README.md){{OPTIONAL_ADR_SUFFIX}}
