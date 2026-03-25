---
name: vite-industry-quality
description: Industry-grade Vite quality standards based on official Vite docs (config, build, performance, env security, plugin API, SSR). Use when hardening Vite projects for production and CI quality gates.
metadata:
  author: GitHub Copilot
  version: "2026.3.25"
  source: Official docs at https://vite.dev
---

# Vite Industry Quality

Use this skill to enforce production-grade Vite standards for reliability, security, and performance.

## Official Sources

- https://vite.dev/config/
- https://vite.dev/guide/build
- https://vite.dev/guide/performance
- https://vite.dev/guide/env-and-mode
- https://vite.dev/guide/api-plugin
- https://vite.dev/guide/ssr

## Quality Baseline

1. Use `vite.config.ts` with `defineConfig` or `satisfies UserConfig`.
2. Keep TypeScript checking outside Vite transform (`tsc --noEmit` in CI).
3. Treat `VITE_*` as public-only; never place secrets in client-exposed variables.
4. Set explicit `base` for non-root deployment paths.
5. Add production load-error handling for dynamic import failures (`vite:preloadError`).
6. Keep HTML non-cacheable on deploys to avoid stale chunk references.
7. Use SSR middleware mode correctly when SSR is required.
8. Prefer explicit import extensions when startup speed matters.
9. Avoid unnecessary barrel files in hot paths.
10. Audit plugin cost and transform scope continuously.

## Production Build Best Practices

- Prefer default modern browser baseline unless business needs older support.
- If older browsers are required, use `@vitejs/plugin-legacy`.
- For libraries, use `build.lib` and externalize framework dependencies.
- Configure chunking intentionally (avoid accidental oversized entry chunks).
- Use `build.license` when legal/license disclosure is needed.

## Environment and Security Best Practices

- Use mode-specific `.env.[mode]` files and keep `*.local` out of git.
- In config, use `loadEnv(mode, process.cwd(), '')` only when env is needed at config-evaluation time.
- Add TypeScript IntelliSense for env vars via `vite-env.d.ts`.
- For CSP deployments, configure nonce handling and avoid `data:` in `script-src`.
- Consider `build.assetsInlineLimit: 0` if CSP policy disallows inlined assets.

## Performance Best Practices

- Profile startup/build with `vite --profile` and inspect `.cpuprofile`.
- Use `vite --debug plugin-transform` to identify expensive plugins.
- Keep plugin hooks lightweight, especially `config`, `configResolved`, `buildStart`.
- Add hook filters / include-exclude patterns to limit transform scope.
- Use `server.warmup` only for frequently requested files.

## Plugin Quality Rules

- Use naming conventions (`vite-plugin-*` / framework-prefixed variants).
- Prefer Vite/Rolldown-compatible hooks and avoid unsupported assumptions.
- Normalize paths using Vite `normalizePath` for cross-platform safety.
- Use `virtual:` + `\0` conventions for virtual modules.
- Prefix custom HMR events to avoid collisions.

## SSR Quality Rules

- Use `middlewareMode` in dev when integrating custom servers.
- Use separate client/server build outputs in production SSR.
- Generate and consume SSR manifest for preload hints where relevant.
- Tune `ssr.noExternal` / `ssr.external` consciously.
- Guard SSR-only code with `import.meta.env.SSR`.

## CI Checklist

- `pnpm typecheck` passes (`tsc --noEmit` equivalent enforced).
- `pnpm build` passes with explicit mode where required.
- Preview smoke test passes (`vite preview`).
- No secret-bearing env variables use `VITE_` prefix.
- Build artifact size and chunk count are monitored per release.
- Dynamic import error handler tested in staging.

## Recommended Prompt Trigger

Use this skill when user asks:

- optimize Vite setup
- harden build config
- production quality for Vite
- Vite performance tuning
- Vite env/security audit
- plugin quality review
