import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// ───────────────────────────────────────────────────────────────────────────
// Enterprise Vite Configuration — AFENDA Web
// Industry-quality standards based on official Vite docs (vite.dev)
// Uses conditional defineConfig for dev vs. build optimization
//
// Performance Profiling:
//   vite --profile                       # Generate .cpuprofile
//   vite --debug plugin-transform        # Identify expensive transforms
//
// Security:
//   ⚠️  All VITE_* env vars are public (inlined at build time)
//   ⚠️  Never use VITE_* prefix for secrets/tokens/credentials
//   ✓  Use mode-specific .env.[mode] files
//   ✓  Keep .env.*.local out of git (already in .gitignore)
//
// Plugin Audit:
//   Run `pnpm analyze` to inspect bundle composition
//   Profile plugin hooks cost with --debug plugin-transform
//   Add include/exclude patterns to limit transform scope
// ───────────────────────────────────────────────────────────────────────────

export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve";
  const isProd = mode === "production";
  const isAnalyze = mode === "analyze";
  const env = loadEnv(mode, __dirname, "");
  const devApiTarget = env.VITE_API_URL || "http://localhost:4001";

  // ── Shared configuration ────────────────────────────────────────────
  const config: UserConfig = {
    // Base public path for deployment
    // For non-root deployments, set explicitly: base: '/my-app/'
    // Affects asset paths, router basename, and manifest URLs
    base: "/",

    plugins: [
      react(),
      // Bundle analyzer for production builds
      isAnalyze &&
        visualizer({
          filename: "dist/stats.html",
          open: true,
          gzipSize: true,
          brotliSize: true,
          template: "treemap", // Options: 'treemap', 'sunburst', 'network'
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@afenda/meta-types": path.resolve(__dirname, "../../packages/meta-types/src/index.ts"),
        "~": path.resolve(__dirname, "./src"),
      },
      // Prevent duplicate copies of shared deps in monorepo
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },

    // Compile-time constants — use __APP_VERSION__ / __BUILD_TIME__ in app code
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    // Performance: JSON.parse is faster than object literals for large JSON
    json: { stringify: "auto" },

    // Asset handling — ensure font files are properly copied
    assetsInclude: ["**/*.woff", "**/*.woff2", "**/*.ttf", "**/*.otf"],
  };

  // ── Development server ──────────────────────────────────────────────
  if (isDev) {
    config.server = {
      port: 5173,
      strictPort: false,
      open: false,

      // Proxy API routes to the backend server
      proxy: {
        "/api": devApiTarget,
        "/meta": devApiTarget,
        "/graphql": devApiTarget,
      },

      // Pre-transform frequently used files to avoid request waterfalls
      // Only add files that are consistently imported early in the app
      warmup: {
        clientFiles: [
          "./src/main.tsx",
          "./src/App.tsx",
          "./src/components/layout/*.tsx",
          "./src/renderers/*.tsx",
        ],
      },

      // Security: restrict fs access and add protective headers
      fs: {
        strict: true,
        deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**"],
      },
      headers: {
        "X-Content-Type-Options": "nosniff",
        // CSP for dev (relaxed for HMR):
        // In production, configure CSP via server/CDN headers
        // For strict CSP, set build.assetsInlineLimit: 0
        // and add nonce support to index.html + plugin
      },
    };

    // Speed up cold starts by pre-bundling heavy dependencies
    config.optimizeDeps = {
      include: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "lucide-react"],
    };
  }

  // ── Production build ────────────────────────────────────────────────
  // Industry best practice: Keep TypeScript checking outside Vite
  // Current setup ✓: pnpm build runs `tsc && vite build`
  if (isProd || command === "build") {
    config.build = {
      // Modern baseline (Chrome 111+, Edge 111+, Firefox 114+, Safari 16.4+)
      // For older browser support, add @vitejs/plugin-legacy
      target: "es2022",
      outDir: "dist",
      sourcemap: "hidden", // Generate maps for error tracking (Sentry), hidden from browser
      minify: "oxc", // 30-90x faster than terser, ~0.5-2% worse compression
      cssMinify: "lightningcss", // Native CSS minification
      cssCodeSplit: true, // Per-route CSS for smaller initial load
      chunkSizeWarningLimit: 500,
      reportCompressedSize: true,
      manifest: true, // Asset manifest for cache busting / backend integration
      license: true, // License compliance file

      // Production deployment checklist:
      // ✓ HTML is non-cacheable (prevents stale chunk references)
      // ✓ vite:preloadError handler installed (see main.tsx)
      // ✓ CI monitors bundle size and chunk count per release

      rolldownOptions: {
        output: {
          // Stable hashed asset naming for predictable long-term caching
          assetFileNames: "assets/[name]-[hash][extname]",

          // Strategic vendor chunk splitting for long-term caching
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              // React core — changes rarely, long cache life
              if (
                id.includes("/react/") ||
                id.includes("/react-dom/") ||
                id.includes("react-router")
              ) {
                return "vendor-react";
              }
              // Data layer
              if (id.includes("@tanstack")) {
                return "vendor-query";
              }
              // State management
              if (
                id.includes("@reduxjs/toolkit") ||
                id.includes("react-redux") ||
                id.includes("immer") ||
                id.includes("zustand") ||
                id.includes("redux")
              ) {
                return "vendor-state";
              }
              // JSON Schema form library (heavy, rarely changes)
              if (
                id.includes("@rjsf/") ||
                id.includes("ajv") ||
                id.includes("@cfworker/json-schema")
              ) {
                return "vendor-forms";
              }
              // UI component libraries
              if (
                id.includes("radix-ui") ||
                id.includes("lucide-react") ||
                id.includes("sonner") ||
                id.includes("cmdk")
              ) {
                return "vendor-ui";
              }
            }
          },
        },
      },
    };
  }

  return config;
});
