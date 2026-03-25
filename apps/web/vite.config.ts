import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// ---------------------------------------------------------------------------
// Enterprise Vite Configuration — AFENDA Web
// Uses conditional defineConfig for dev vs. build optimization.
// Docs: https://vite.dev/config/
// ---------------------------------------------------------------------------

export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve";
  const isProd = mode === "production";
  const isAnalyze = mode === "analyze";
  const env = loadEnv(mode, __dirname, "");
  const devApiTarget = env.VITE_API_URL || "http://localhost:4001";

  // ── Shared configuration ────────────────────────────────────────────
  const config: UserConfig = {
    plugins: [
      react(),
      // Bundle analyzer for production builds
      isAnalyze && visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // Options: 'treemap', 'sunburst', 'network'
      }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@afenda/meta-types": path.resolve(
          __dirname,
          "../../packages/meta-types/src/index.ts",
        ),
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
      },
    };

    // Speed up cold starts by pre-bundling heavy dependencies
    config.optimizeDeps = {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "lucide-react",
      ],
    };
  }

  // ── Production build ────────────────────────────────────────────────
  if (isProd || command === "build") {
    config.build = {
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

      rolldownOptions: {
        output: {
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
