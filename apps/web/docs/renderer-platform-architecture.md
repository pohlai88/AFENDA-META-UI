# Renderer Platform Architecture

## Overview

The **Renderer Platform** is a metadata-driven UI infrastructure that transforms the application from a collection of React components into a **deterministic UI engine**. This architecture treats renderers like APIs, enabling versioned coexistence, graceful failure handling, and capability-driven feature negotiation.

## Maturity Model

The platform evolves through six maturity levels:

### L1: Direct Imports (Fragile)
```tsx
// ❌ Fragile: No lazy loading, no version control
import { MetaList } from './renderers/MetaList';
```

### L2: Basic Lazy Loading
```tsx
// ⚠️ Better: Lazy loading, but failures crash the app
const MetaList = lazy(() => import('./renderers/MetaList'));
```

### L3: Versioned Registry ✅
```tsx
// ✅ Current: Central registry with version tracking
const MetaListV2 = getRenderer("list", "v2");
```

### L4: Contracts + Adapters ✅
```tsx
// ✅ Target: Formal contracts, metadata adapters, resilient loading
const MetaList = safeRendererLazy("list", "v2");
const adapted = adaptMetadata(legacyMeta, "2.0");
```

### L5: Capability Negotiation 🔄
```tsx
// 🚧 In Progress: Feature detection without hard-coding
const capabilities = getContract("list", "v2")?.capabilities;
{capabilities?.bulkActions && <BulkActionsToolbar />}
```

### L6: Self-Healing Platform (Future)
```tsx
// 🔮 Future: Auto-fallback to v1 if v2 fails, telemetry, A/B testing
```

## Architecture Layers

### 1. Contract Type System
**File:** `src/renderers/types/contracts.ts`

Formal interfaces that define renderer APIs:

```typescript
interface RendererContract {
  rendererId: string;           // "meta-list-v2"
  version: RendererVersion;     // "v1" | "v2" | "v3"
  type: RendererType;           // "list" | "form" | "dashboard"
  supportedMetaVersions: string[]; // ["1.0", "2.0"]
  capabilities: RendererCapabilities;
  requiredMetaFields: string[]; // ["model", "fields"]
  description: string;
}

interface RendererCapabilities {
  bulkActions?: boolean;
  inlineEdit?: boolean;
  virtualization?: boolean;
  realTimeSync?: boolean;
  dragDrop?: boolean;
  filtering?: boolean;
  sorting?: boolean;
  pagination?: boolean;
  export?: boolean;
  customActions?: boolean;
  responsive?: boolean;
}
```

**Why Contracts?**
- **Treat renderers like APIs**: Formal interface declarations prevent silent breakage
- **Version compatibility**: Declare which metadata versions are supported
- **Feature detection**: Query capabilities without loading the module
- **Type safety**: TypeScript enforces contract compliance at compile time

### 2. Renderer Registry
**File:** `src/renderers/registry.ts`

Central orchestration point for all renderers:

```typescript
export const RendererRegistry: Record<RendererType, Record<RendererVersion, RendererRegistration>> = {
  list: {
    v1: {
      loader: () => import("./MetaList"),
      exportName: "MetaList",
      contract: { /* ... */ },
    },
    v2: {
      loader: () => import("./MetaListV2"),
      exportName: "MetaListV2",
      contract: { /* ... */ },
    },
  },
  form: {
    v1: { /* ... */ },
    v2: { /* ... */ },
  },
  // ... dashboard, detail, grid, etc.
};
```

**Key Functions:**
- `getRenderer(type, version)` — Lookup specific version
- `getLatestRenderer(type)` — Auto-resolve to newest version
- `hasCapability(type, version, capability)` — Feature detection without import
- `validateRegistration(type, version)` — Contract compliance check

**Why a Registry?**
- **Version coexistence**: Multiple versions can coexist without conflicts
- **Lazy loading**: Modules only load when needed
- **Centralized metadata**: All renderer info in one place for introspection
- **Safe fallbacks**: Can fallback to v1 if v2 fails to load

### 3. Safe Lazy Loader
**File:** `src/renderers/safeLazy.tsx`

Prevents silent lazy-loading failures:

```typescript
const MetaList = safeLazy(
  () => import("./MetaListV2"),
  { 
    exportName: "MetaListV2", 
    rendererId: "meta-list-v2" 
  }
);
```

**Validation Steps:**
1. ✅ Module loaded successfully
2. ✅ Expected export exists (named or default)
3. ✅ Export is a function (React component)
4. ❌ Show rich fallback UI on any failure

**Fallback UI Features:**
- Displays renderer ID and expected export name
- Shows error message with diagnostic context
- Lists common causes (file overwrite, export mismatch, etc.)
- Provides actionable fix: "Run `pnpm ci:contracts`"

**Advanced Wrapper:**
```typescript
// Auto-injects rendererId and exportName from registry
const MetaList = safeRendererLazy("list", "v2");
```

### 4. Metadata Adapters
**File:** `src/renderers/adapters.ts`

Transforms legacy metadata into modern formats:

```typescript
// Old metadata from v1.0 system
const legacyMeta: LegacyListMeta = {
  model: "Contact",
  columns: [/* ... */],  // ← Old field name
  actions: [/* ... */],
};

// Adapt to v2.0 format
const modernMeta = adaptLegacyListMeta(legacyMeta);
// {
//   model: "Contact",
//   fields: [/* ... */],     // ← Normalized
//   bulkActions: [],         // ← Polyfilled
//   permissions: {},         // ← Defaults added
//   defaultSort: undefined,
// }
```

**Why Adapters?**
- **Backward compatibility**: Old metadata works with new renderers
- **Polyfill missing fields**: Safe defaults for new features
- **Capability-aware**: Only include features the renderer supports
- **Version detection**: Auto-detect metadata schema version

## Usage Patterns

### Pattern 1: Direct Registry Usage
```tsx
import { getRenderer } from "@/renderers/registry";

const registration = getRenderer("list", "v2");
const MetaListModule = await registration.loader();
const MetaListV2 = MetaListModule[registration.exportName];

<MetaListV2 meta={meta} data={data} />
```

### Pattern 2: Safe Lazy Loading in Routes
```tsx
// apps/web/src/pages/model-list.tsx
import { safeRendererLazy } from "@/renderers/safeLazy";

// Auto-injects rendererId="meta-list-v2" and exportName="MetaListV2"
const MetaListV2 = safeRendererLazy("list", "v2");

export default function ModelList() {
  return <MetaListV2 /* ... */ />;
}
```

### Pattern 3: Capability-Driven UI
```tsx
import { getContract } from "@/renderers/registry";

function ListPage() {
  const capabilities = getContract("list", "v2")?.capabilities;
  
  return (
    <>
      {capabilities?.bulkActions && <BulkActionsToolbar />}
      {capabilities?.filtering && <FilterPanel />}
      {capabilities?.export && <ExportButton />}
      <MetaList /* ... */ />
    </>
  );
}
```

### Pattern 4: Metadata Adaptation
```tsx
import { adaptMetadata, detectMetadataVersion } from "@/renderers/adapters";

function DynamicRenderer({ rawMeta }: { rawMeta: any }) {
  const version = detectMetadataVersion(rawMeta);
  console.log("Metadata version:", version); // "1.0" | "1.1" | "2.0"
  
  const modernMeta = adaptMetadata(rawMeta, "2.0");
  
  const MetaList = safeRendererLazy("list", "v2");
  return <MetaList meta={modernMeta} />;
}
```

### Pattern 5: Version Fallback
```tsx
import { getRenderer, getLatestRenderer } from "@/renderers/registry";

function SmartRenderer({ type, preferredVersion }: Props) {
  const registration = getRenderer(type, preferredVersion) 
    || getLatestRenderer(type);
  
  if (!registration) {
    return <div>No renderer available for {type}</div>;
  }
  
  const Component = safeRendererLazy(type, registration.contract.version);
  return <Component /* ... */ />;
}
```

## Testing Strategy

### 1. Registry Integrity Tests
**Location:** `src/renderers/registry.test.ts` (49 tests)

Validates:
- ✅ All registered renderers are loadable
- ✅ Contracts have required fields
- ✅ Capabilities are declared
- ✅ Modules export expected components
- ✅ Registry query functions work correctly

**Run:** `pnpm test:registry`

### 2. Safe Lazy Loader Tests
**Location:** `src/renderers/safeLazy.test.tsx` (11 tests)

Validates:
- ✅ Successful loading (default and named exports)
- ✅ Fallback UI on null module
- ✅ Fallback UI on missing export
- ✅ Fallback UI on wrong export type
- ✅ Fallback UI on import error
- ✅ Custom fallback component support

**Run:** `pnpm test:registry`

### 3. Contract Compliance Tests
**Location:** `src/routes/lazy-pages.contract.test.ts` (19 tests)

Validates:
- ✅ All page modules export default React component
- ✅ All renderer modules export named component

**Run:** `pnpm test:contracts`

### 4. CI Gate Integration
**Location:** `tools/ci-gate/contracts/index.mjs`

Prevents merge if:
- ❌ Any lazy page missing default export
- ❌ Any renderer missing named export
- ❌ Registry has invalid registrations

**Run:** `pnpm ci:gate --gate=contracts`

## Migration Guide

### Step 1: Direct Import → Registry (Backward Compatible)
```diff
- import { MetaListV2 } from "@/renderers/MetaListV2";
+ import { getRenderer } from "@/renderers/registry";
+ const registration = getRenderer("list", "v2")!;
+ const module = await registration.loader();
+ const MetaListV2 = module[registration.exportName];
```

### Step 2: Add Safe Lazy Wrapper (Recommended)
```diff
- const MetaListV2 = lazy(() => import("./MetaListV2"));
+ import { safeRendererLazy } from "@/renderers/safeLazy";
+ const MetaListV2 = safeRendererLazy("list", "v2");
```

### Step 3: Capability-Driven Features (Future)
```diff
  function ListPage() {
+   const capabilities = getContract("list", "v2")?.capabilities;
  
    return (
      <>
+       {capabilities?.bulkActions && <BulkActionsToolbar />}
        <MetaList />
      </>
    );
  }
```

## Troubleshooting

### Issue: "Renderer Loading Failed" UI appears

**Cause:** Module failed to load or export is missing

**Solution:**
1. Run `pnpm ci:contracts` to see which export is broken
2. Check `src/renderers/registry.ts` — verify `exportName` matches actual export
3. Check renderer file — ensure export exists and is a function
4. Check browser console for detailed error logs

### Issue: "Element type is invalid. Received a promise that resolves to: undefined"

**Cause:** Direct lazy import without validation

**Solution:** Use `safeLazy()` or `safeRendererLazy()` instead of raw `React.lazy()`

### Issue: Registry validation fails in CI

**Cause:** Invalid registration (missing fields, broken loader, etc.)

**Solution:**
1. Run `pnpm test:registry` locally to see detailed errors
2. Check `validateRegistration()` output for specific issues
3. Ensure contract has all required fields (`rendererId`, `version`, `type`, `supportedMetaVersions`, `capabilities`)

## Extending the Platform

### Adding a New Renderer Type

**Step 1:** Define contract in `types/contracts.ts`
```typescript
export interface GridRendererProps extends RendererBaseProps {
  columns: number;
  gap?: string;
}
```

**Step 2:** Create renderer component
```tsx
// src/renderers/MetaGrid.tsx
export function MetaGrid(props: GridRendererProps) {
  // Implementation
}
```

**Step 3:** Register in `registry.ts`
```typescript
grid: {
  v1: {
    loader: () => import("./MetaGrid"),
    exportName: "MetaGrid",
    contract: {
      rendererId: "meta-grid-v1",
      version: "v1",
      type: "grid",
      supportedMetaVersions: ["1.0"],
      capabilities: { responsive: true },
      requiredMetaFields: ["model", "fields"],
      description: "Grid renderer with configurable columns",
    },
  },
},
```

**Step 4:** Add contract test
```typescript
// src/renderers/MetaGrid.contract.test.ts
it("exports MetaGrid component", async () => {
  const module = await import("./MetaGrid");
  expect(typeof module.MetaGrid).toBe("function");
});
```

### Adding a New Renderer Version

**Example:** Creating `list.v3` with virtualization

**Step 1:** Extend contract types
```typescript
// contracts.ts
interface ListV3Capabilities extends RendererCapabilities {
  virtualization: true;
  dynamicRowHeight?: boolean;
}
```

**Step 2:** Create v3 component
```tsx
// src/renderers/MetaListV3.tsx
export function MetaListV3(props: ListRendererProps) {
  // Use @tanstack/react-virtual for virtualization
}
```

**Step 3:** Register v3
```typescript
list: {
  v1: { /* ... */ },
  v2: { /* ... */ },
  v3: {
    loader: () => import("./MetaListV3"),
    exportName: "MetaListV3",
    contract: {
      rendererId: "meta-list-v3",
      version: "v3",
      type: "list",
      supportedMetaVersions: ["2.0", "2.1"],
      capabilities: {
        ...listV2Capabilities,
        virtualization: true,
        dynamicRowHeight: true,
      },
      requiredMetaFields: ["model", "fields"],
      description: "Virtualized list renderer for handling 10k+ rows",
    },
  },
},
```

**Step 4:** `getLatestRenderer("list")` now returns v3 automatically

## Performance Considerations

### Lazy Loading Benefits
- **Initial bundle size**: Renderers only load when needed
- **Code splitting**: Each renderer is a separate chunk
- **Parallel loading**: Multiple renderers can load simultaneously

### Registry Overhead
- **Minimal**: Registry is a static object (~10KB)
- **No runtime cost**: Lookups are simple object access
- **Type-safe**: No reflection or dynamic string parsing

### Testing Performance
- **Registry tests**: ~5s for 49 tests (loads all modules)
- **Contract tests**: <1s for 19 tests (static analysis)
- **Safe lazy tests**: <1s for 11 tests (mocked imports)

## Future Enhancements

### L5: Capability Negotiation (In Progress)
- Dynamic UI based on renderer capabilities
- Auto-enable features if renderer supports them
- Graceful degradation for missing capabilities

### L6: Self-Healing Platform (Planned)
- Auto-fallback to v1 if v2 fails to load
- Telemetry for load failures and fallbacks
- A/B testing different renderer versions
- Hot-reload renderers in development

### Advanced Features
- **Renderer plugins**: Extend renderers without forking
- **Metadata validation**: Zod schemas for metadata
- **Renderer marketplace**: Share renderers across projects
- **Visual renderer builder**: Low-code renderer creation

## References

- **Contracts:** [src/renderers/types/contracts.ts](../src/renderers/types/contracts.ts)
- **Registry:** [src/renderers/registry.ts](../src/renderers/registry.ts)
- **Safe Lazy:** [src/renderers/safeLazy.tsx](../src/renderers/safeLazy.tsx)
- **Adapters:** [src/renderers/adapters.ts](../src/renderers/adapters.ts)
- **Tests:** [src/renderers/registry.test.ts](../src/renderers/registry.test.ts)
