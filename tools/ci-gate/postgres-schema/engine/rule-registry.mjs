/**
 * Engine v2 — Rule Registry
 * ==========================
 * Composes domain rule packs, validates uniqueness, and provides
 * deterministic ordering for reproducible gate output.
 */

/**
 * @typedef {import('./rule-types.mjs').Rule} Rule
 */

/**
 * Compose multiple domain rule packs into a single deduplicated, sorted array.
 *
 * @param {...Rule[]} domainPacks - One or more arrays of rules
 * @returns {Rule[]} Merged, validated, and sorted rules
 * @throws {Error} If duplicate rule IDs are detected
 */
export function composeDomainRules(...domainPacks) {
  /** @type {Rule[]} */
  const merged = domainPacks.flat();

  // Validate no duplicate rule IDs
  const seen = new Map();
  for (const rule of merged) {
    if (seen.has(rule.id)) {
      const existing = seen.get(rule.id);
      throw new Error(
        `Duplicate rule ID "${rule.id}" detected:\n` +
        `  First:  table="${existing.table}" type="${existing.type}"\n` +
        `  Second: table="${rule.table}" type="${rule.type}"`
      );
    }
    seen.set(rule.id, rule);
  }

  // Deterministic sort: table name → type → id
  return merged.sort((a, b) => {
    const tableCompare = a.table.localeCompare(b.table);
    if (tableCompare !== 0) return tableCompare;

    const typeCompare = a.type.localeCompare(b.type);
    if (typeCompare !== 0) return typeCompare;

    return a.id.localeCompare(b.id);
  });
}
