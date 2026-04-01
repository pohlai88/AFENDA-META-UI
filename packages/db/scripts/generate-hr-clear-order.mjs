/**
 * Generates FK-safe HR table delete order from live Postgres (hr schema only).
 * Run: pnpm --filter @afenda/db exec node scripts/generate-hr-clear-order.mjs
 * Requires DATABASE_URL or DATABASE_URL_MIGRATIONS (repo-root .env).
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dbPkg = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root = path.resolve(dbPkg, "../..");
config({ path: path.join(root, ".env") });

const url = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL or DATABASE_URL_MIGRATIONS required");
  process.exit(1);
}

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const fks = await client.query(`
  SELECT tc.table_name AS child, ccu.table_name AS parent
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
  JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'hr'
    AND ccu.table_schema = 'hr'
`);

const tabs = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'hr' ORDER BY tablename`
);
await client.end();

const nodes = new Set(tabs.rows.map((r) => r.tablename));
const adj = new Map();
const indeg = new Map();
for (const n of nodes) {
  adj.set(n, []);
  indeg.set(n, 0);
}
for (const row of fks.rows) {
  const child = row.child;
  const parent = row.parent;
  if (!nodes.has(child) || !nodes.has(parent) || child === parent) continue;
  adj.get(child).push(parent);
  indeg.set(parent, indeg.get(parent) + 1);
}

const q = [];
for (const [n, d] of indeg) {
  if (d === 0) q.push(n);
}
const out = [];
while (q.length > 0) {
  q.sort();
  const n = q.shift();
  out.push(n);
  for (const p of adj.get(n)) {
    indeg.set(p, indeg.get(p) - 1);
    if (indeg.get(p) === 0) q.push(p);
  }
}

if (out.length !== nodes.size) {
  console.error(`Topological sort incomplete: ${out.length} vs ${nodes.size} (cycle or missing edges?)`);
  process.exit(2);
}

const camelOrder = out.map(snakeToCamel);
console.log(JSON.stringify(camelOrder, null, 0));
