# temporal-wire CI gate

Enforces:

- No ad-hoc `z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)` outside `packages/db/src/wire/temporal.ts` — use `dateOnlyWire` from `@afenda/db/wire`.
- `z.coerce.date(` only in schema files listed in `allowlist.json` (shrink as modules migrate to `*Wire` schemas).

Run: `pnpm ci:gate:temporal-wire`

Optional follow-on: AST-based ban on `Date.parse(` in refinements; codemod under `tools/scripts/temporal-wire-report.mjs`.
