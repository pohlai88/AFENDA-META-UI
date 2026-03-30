# zod4-iso-dates

CI gate for **all** Zod 4 ISO-related deprecations on `z.string()`:

| Deprecated | Use |
|------------|-----|
| `z.string().date(` | `z.iso.date(` |
| `z.string().datetime(` | `z.iso.datetime(` |
| `z.string().time(` | `z.iso.time(` |
| `z.string().duration(` | `z.iso.duration(` |

Upstream: `zod/v4/classic/schemas.d.ts` (`ZodString#date`, `#datetime`, `#time`, `#duration`). Docs: [Zod v4 API](https://v4.zod.dev/api).

This gate does **not** flag other `z.string()` deprecations (e.g. `.guid()` → `z.guid()`); only the four ISO/temporal chains above.

## Run

```bash
pnpm ci:gate:zod4-iso-dates
node tools/ci-gate/zod4-iso-dates/index.mjs
pnpm ci:gate --gate=zod4-iso-dates
```

Scans tracked `*.ts` / `*.tsx` via `git ls-files`. JSDoc / `//` lines are ignored when the pattern appears only in the comment portion of the line.
