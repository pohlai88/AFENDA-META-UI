# N+1 / relational API audit (ongoing)

Use this checklist when touching app or human-owned report modules:

1. Profile or log query counts per request for nested list endpoints.
2. If N+1 appears, prefer Drizzle **Relational Queries API** (`db.query` with `with:`) for one SQL — see [Drizzle RQB](https://orm.drizzle.team/docs/rqb) and [`ARCHITECTURE.md`](./ARCHITECTURE.md).
3. Do not change generated `*.access.ts` for relational loading unless the generator is updated deliberately.

Record findings in PR descriptions; no requirement to pre-audit the entire monorepo in one pass.
