import { extractSchema } from "../../postgres-schema/extractors/drizzle-schema.mjs";
import { RULE_IDS } from "../rule-ids.mjs";
import { toRepoRelative } from "../config.mjs";

/**
 * @param {string} _content
 * @param {string} absolutePath
 * @returns {Array<{ ruleId: string, file: string, table?: string, message: string, line?: number }>}
 */
export function run(_content, absolutePath) {
  const file = toRepoRelative(absolutePath);
  /** @type {Array<{ ruleId: string, file: string, table?: string, message: string, line?: number }>} */
  const out = [];

  let result;
  try {
    result = extractSchema(absolutePath, { silent: true });
  } catch (e) {
    out.push({
      ruleId: RULE_IDS.TABLE_PARSE_ERROR,
      file,
      table: "*",
      message: `extractSchema failed: ${e instanceof Error ? e.message : String(e)}`,
    });
    return out;
  }

  for (const [tableName, model] of Object.entries(result.tables)) {
    if (model && model._parseError) {
      out.push({
        ruleId: RULE_IDS.TABLE_PARSE_ERROR,
        file,
        table: tableName,
        message: `Table "${tableName}" failed to parse in drizzle-schema extractor.`,
      });
    }
  }

  return out;
}
