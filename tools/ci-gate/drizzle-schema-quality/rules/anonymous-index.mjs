import { RULE_IDS } from "../rule-ids.mjs";
import { toRepoRelative } from "../config.mjs";

/** `index().on` — unnamed */
const ANON_INDEX_RE = /\bindex\s*\(\s*\)\s*\./g;
const ANON_UNIQUE_RE = /\buniqueIndex\s*\(\s*\)\s*\./g;

/**
 * `index(someIdentifier).on` / `uniqueIndex(foo).on` — not a string literal name (bad for migration clarity).
 * Does not flag `index("name")` or `index(\`name\`)`.
 */
const NON_STRING_INDEX_RE = /\bindex\s*\(\s*([a-zA-Z_$][\w$]*)\s*\)\s*\./g;
const NON_STRING_UNIQUE_RE = /\buniqueIndex\s*\(\s*([a-zA-Z_$][\w$]*)\s*\)\s*\./g;

/** Numeric or other non-literal “name” */
const INDEX_NUMERIC_RE = /\bindex\s*\(\s*\d+\s*\)\s*\./g;
const UNIQUE_NUMERIC_RE = /\buniqueIndex\s*\(\s*\d+\s*\)\s*\./g;

/** Template literal with interpolation — unstable migration name */
const INDEX_TEMPLATE_DYNAMIC_RE = /\bindex\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`\s*\)\s*\./g;
const UNIQUE_TEMPLATE_DYNAMIC_RE = /\buniqueIndex\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`\s*\)\s*\./g;

/**
 * @param {string} content
 * @param {string} absolutePath
 * @returns {import('../rule-ids.mjs').Finding[]}
 */
export function run(content, absolutePath) {
  const file = toRepoRelative(absolutePath);
  /** @type {import('../rule-ids.mjs').Finding[]} */
  const out = [];

  let m;
  while ((m = ANON_INDEX_RE.exec(content)) !== null) {
    out.push({
      ruleId: RULE_IDS.INDEX_ANONYMOUS,
      file,
      table: "*",
      line: lineNumberAtIndex(content, m.index),
      message: "Anonymous index().on(...) — use index(\"name\").on(...) for migration clarity.",
    });
  }
  while ((m = ANON_UNIQUE_RE.exec(content)) !== null) {
    out.push({
      ruleId: RULE_IDS.UNIQUE_INDEX_ANONYMOUS,
      file,
      table: "*",
      line: lineNumberAtIndex(content, m.index),
      message:
        "Anonymous uniqueIndex().on(...) — use uniqueIndex(\"name\").on(...) for migration clarity.",
    });
  }

  NON_STRING_INDEX_RE.lastIndex = 0;
  while ((m = NON_STRING_INDEX_RE.exec(content)) !== null) {
    out.push({
      ruleId: RULE_IDS.INDEX_ANONYMOUS,
      file,
      table: "*",
      line: lineNumberAtIndex(content, m.index),
      message: `Non-literal index name (${m[1]}) — use index(\"explicit_name\").on(...) for stable migrations.`,
    });
  }
  NON_STRING_UNIQUE_RE.lastIndex = 0;
  while ((m = NON_STRING_UNIQUE_RE.exec(content)) !== null) {
    out.push({
      ruleId: RULE_IDS.UNIQUE_INDEX_ANONYMOUS,
      file,
      table: "*",
      line: lineNumberAtIndex(content, m.index),
      message: `Non-literal uniqueIndex name (${m[1]}) — use uniqueIndex(\"explicit_name\").on(...).`,
    });
  }

  INDEX_NUMERIC_RE.lastIndex = 0;
  while ((m = INDEX_NUMERIC_RE.exec(content)) !== null) {
    out.push({
      ruleId: RULE_IDS.INDEX_ANONYMOUS,
      file,
      table: "*",
      line: lineNumberAtIndex(content, m.index),
      message: "index() must use a string literal name, not a numeric literal — use index(\"name\").on(...).",
    });
  }
  UNIQUE_NUMERIC_RE.lastIndex = 0;
  while ((m = UNIQUE_NUMERIC_RE.exec(content)) !== null) {
    out.push({
      ruleId: RULE_IDS.UNIQUE_INDEX_ANONYMOUS,
      file,
      table: "*",
      line: lineNumberAtIndex(content, m.index),
      message:
        "uniqueIndex() must use a string literal name, not a numeric literal — use uniqueIndex(\"name\").on(...).",
    });
  }

  INDEX_TEMPLATE_DYNAMIC_RE.lastIndex = 0;
  while ((m = INDEX_TEMPLATE_DYNAMIC_RE.exec(content)) !== null) {
    out.push({
      ruleId: RULE_IDS.INDEX_ANONYMOUS,
      file,
      table: "*",
      line: lineNumberAtIndex(content, m.index),
      message:
        "index() with template interpolation — use a fixed string literal index(\"stable_name\").on(...) for migrations.",
    });
  }
  UNIQUE_TEMPLATE_DYNAMIC_RE.lastIndex = 0;
  while ((m = UNIQUE_TEMPLATE_DYNAMIC_RE.exec(content)) !== null) {
    out.push({
      ruleId: RULE_IDS.UNIQUE_INDEX_ANONYMOUS,
      file,
      table: "*",
      line: lineNumberAtIndex(content, m.index),
      message:
        "uniqueIndex() with template interpolation — use a fixed string literal for migration-stable names.",
    });
  }

  return out;
}

function lineNumberAtIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}
