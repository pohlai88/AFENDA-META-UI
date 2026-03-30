/**
 * Parse Drizzle schema source for exported table symbols and SQL table names.
 * @param {string} source
 * @returns {Array<{ symbol: string; sqlName: string }>}
 */
export function extractExportedTables(source) {
  /** @type {Array<{ symbol: string; sqlName: string }>} */
  const out = [];

  const reSchema = /export const (\w+)\s*=\s*\w+Schema\.table\(\s*\n?\s*"([^"]+)"/g;
  let m;
  while ((m = reSchema.exec(source)) !== null) {
    out.push({ symbol: m[1], sqlName: m[2] });
  }

  const rePg = /export const (\w+)\s*=\s*pgTable\(\s*\n?\s*"([^"]+)"/g;
  while ((m = rePg.exec(source)) !== null) {
    out.push({ symbol: m[1], sqlName: m[2] });
  }

  return out;
}
