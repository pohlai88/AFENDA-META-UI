/**
 * Safe Lazy Loader
 * ================
 * Prevents silent failures when lazy-loading renderers.
 * Validates module exports and provides graceful fallbacks.
 */

import React from "react";
import type { RendererModule, RendererType, RendererVersion } from "./types/contracts";

/** Props shape for inline fallback renderer components (renderer props are unknown at this boundary). */
type RendererFallbackProps = Record<string, unknown>;

/**
 * Fallback renderer for when loading fails
 */
function FallbackRenderer({
  error,
  rendererId,
  exportName,
}: {
  error?: string;
  rendererId?: string;
  exportName?: string;
}) {
  return (
    <div
      style={{
        padding: "2rem",
        border: "2px solid #ef4444",
        borderRadius: "0.5rem",
        backgroundColor: "#fef2f2",
        color: "#991b1b",
      }}
    >
      <h2 style={{ margin: 0, marginBottom: "1rem", fontSize: "1.25rem", fontWeight: 600 }}>
        ⚠️ Renderer Loading Failed
      </h2>

      {rendererId && (
        <p style={{ margin: "0.5rem 0" }}>
          <strong>Renderer:</strong> {rendererId}
        </p>
      )}

      {exportName && (
        <p style={{ margin: "0.5rem 0" }}>
          <strong>Expected export:</strong> {exportName}
        </p>
      )}

      {error && (
        <p style={{ margin: "0.5rem 0" }}>
          <strong>Error:</strong> {error}
        </p>
      )}

      <div
        style={{
          marginTop: "1rem",
          padding: "1rem",
          backgroundColor: "#fee2e2",
          borderRadius: "0.25rem",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.875rem" }}>
          <strong>Common causes:</strong>
        </p>
        <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem", fontSize: "0.875rem" }}>
          <li>Module file doesn't export expected function</li>
          <li>Export name mismatch (check registry configuration)</li>
          <li>Module file accidentally overwritten or deleted</li>
          <li>Import path in registry is incorrect</li>
        </ul>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
          Run{" "}
          <code
            style={{
              padding: "0.125rem 0.25rem",
              backgroundColor: "#fca5a5",
              borderRadius: "0.25rem",
            }}
          >
            pnpm ci:contracts
          </code>{" "}
          to validate all renderer exports.
        </p>
      </div>
    </div>
  );
}

/**
 * Safe lazy loader options
 */
interface SafeLazyOptions {
  /** Name of the expected export (if not default) */
  exportName?: string;

  /** Renderer ID for error reporting */
  rendererId?: string;

  /** Custom fallback component */
  fallback?: React.ComponentType<RendererFallbackProps>;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Safe lazy loader for renderers
 * Validates module exports and provides graceful fallback
 *
 * @example
 * ```tsx
 * const MetaList = safeLazy(
 *   () => import("./MetaListV2"),
 *   { exportName: "MetaListV2", rendererId: "meta-list-v2" }
 * );
 * ```
 */
export function safeLazy<T extends React.ComponentType<any>>(
  importer: () => Promise<RendererModule>,
  options: SafeLazyOptions = {}
): React.LazyExoticComponent<T> {
  const { exportName, rendererId, fallback, debug = false } = options;

  return React.lazy(async () => {
    try {
      const mod = await importer();

      if (debug) {
        console.log(`[safeLazy] Loaded module:`, {
          rendererId,
          exportName,
          moduleKeys: Object.keys(mod),
        });
      }

      // Check for null/undefined module
      if (!mod) {
        const error = "Module loaded but is null or undefined";
        console.error(`[safeLazy] ${error}`, { rendererId, exportName });
        return {
          default:
            fallback ||
            ((_props: RendererFallbackProps) => (
              <FallbackRenderer error={error} rendererId={rendererId} exportName={exportName} />
            )),
        };
      }

      // Try to find the export
      let component: React.ComponentType<Record<string, unknown>> | undefined;

      if (exportName) {
        // Look for named export — cast through unknown since RendererModule uses unknown index sig
        component = mod[exportName] as React.ComponentType<Record<string, unknown>> | undefined;

        if (!component) {
          const error = `Named export '${exportName}' not found`;
          console.error(`[safeLazy] ${error}`, {
            rendererId,
            availableExports: Object.keys(mod),
          });
          return {
            default:
              fallback ||
              ((_props: RendererFallbackProps) => (
                <FallbackRenderer error={error} rendererId={rendererId} exportName={exportName} />
              )),
          };
        }
      } else {
        // Look for default export
        component = mod.default;

        if (!component) {
          const error = "Default export not found";
          console.error(`[safeLazy] ${error}`, {
            rendererId,
            availableExports: Object.keys(mod),
          });
          return {
            default:
              fallback ||
              ((_props: RendererFallbackProps) => (
                <FallbackRenderer error={error} rendererId={rendererId} exportName="default" />
              )),
          };
        }
      }

      // Validate it's a function (React component)
      if (typeof component !== "function") {
        const error = `Export is not a function (got ${typeof component})`;
        console.error(`[safeLazy] ${error}`, { rendererId, exportName });
        return {
          default:
            fallback ||
            ((_props: RendererFallbackProps) => (
              <FallbackRenderer error={error} rendererId={rendererId} exportName={exportName} />
            )),
        };
      }

      if (debug) {
        console.log(`[safeLazy] Successfully loaded renderer:`, {
          rendererId,
          exportName: exportName || "default",
        });
      }

      return { default: component as T };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[safeLazy] Import failed:`, {
        rendererId,
        exportName,
        error,
      });

      return {
        default:
          fallback ||
          ((_props: RendererFallbackProps) => (
            <FallbackRenderer error={error} rendererId={rendererId} exportName={exportName} />
          )),
      };
    }
  }) as React.LazyExoticComponent<T>;
}

/**
 * Safe lazy loader using renderer registry
 * Automatically injects rendererId and exportName from registration
 *
 * @example
 * ```tsx
 * const MetaList = safeRendererLazy("list", "v2");
 * ```
 */
export function safeRendererLazy<T extends React.ComponentType<any>>(
  type: RendererType,
  version: RendererVersion = "v1",
  options: Omit<SafeLazyOptions, "exportName" | "rendererId"> = {}
): React.LazyExoticComponent<T> {
  // Import synchronously - registry should already be loaded
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getRenderer } = require("./registry");
  const registration = getRenderer(type, version);

  if (!registration) {
    console.error(`[safeRendererLazy] Renderer not found:`, { type, version });
    return safeLazy<T>(() =>
      Promise.resolve({
        default: ((_props: RendererFallbackProps) => (
          <FallbackRenderer
            error={`Renderer ${type}@${version} not registered`}
            rendererId={`${type}-${version}`}
          />
        )) as unknown as T,
      })
    );
  }

  // Just call safeLazy with the registration params - no double-wrapping
  return safeLazy<T>(registration.loader, {
    ...options,
    exportName: registration.exportName,
    rendererId: registration.contract.rendererId,
  });
}
