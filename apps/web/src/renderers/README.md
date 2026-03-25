# Metadata-Driven Renderers

Enterprise-grade UI components that auto-generate from `ModelMeta` definitions.

## 📊 MetaListV2

**Location**: `MetaListV2.tsx`

Production-ready data table built with:
- **@tanstack/react-table v8** - Headless table library
- **shadcn/ui Table components** - Accessible styling
- **Server-side pagination** - Efficient data loading
- **Multi-column sorting** - Click headers to sort
- **Column visibility toggle** - Hide/show columns dynamically
- **Loading skeletons** - Smooth loading states
- **Empty states** - Guidance when no data

### Features

✅ **Sortable columns** - Click any header to sort (asc/desc)  
✅ **Column hiding** - Toggle visibility via dropdown menu  
✅ **Pagination** - Navigate large datasets with first/prev/next/last controls  
✅ **Loading states** - Skeleton screens during data fetch  
✅ **Empty states** - Contextual messages + create CTA  
✅ **Row click** - Optional callback for navigation  
✅ **Permission-aware** - Respects `can_create` permission  
✅ **Responsive** - Works on all screen sizes  
✅ **Type-safe** - Full TypeScript coverage  

### Usage

```tsx
import { MetaListV2 } from "~/renderers/MetaListV2";

<MetaListV2
  model="partners"
  onRowClick={(record) => navigate(`/partners/${record.id}`)}
  onNew={() => navigate("/partners/new")}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `model` | `string` | Model name (e.g., "partners", "products") |
| `onRowClick` | `(record) => void` | Optional callback when row is clicked |
| `onNew` | `() => void` | Optional callback for "Create" button |
| `embedded` | `boolean` | Render without PageContainer wrapper (default: `false`) |

### Cell Formatting

Auto-formats based on `MetaField.type`:
- **boolean** → Badge ("Yes" / "No")
- **date** → `toLocaleDateString()`
- **datetime** → `toLocaleString()`
- **enum** → Colored badge with label
- **currency** → `Intl.NumberFormat` with currency symbol
- **null/undefined** → "—" placeholder

### Sorting

- Sortable columns show ↕ icon
- Unsortable columns (when `field.sortable === false`) show plain header
- Sorting is **server-side** via `orderBy` + `orderDir` query params

### Column Visibility

- "Columns" dropdown in top-left
- Checkboxes to show/hide columns
- Persists during session (local component state)

### Pagination

- Shows "Page X of Y" + total record count
- First/Previous/Next/Last buttons
- Disables appropriately at boundaries
- Server-side with `page` + `limit` query params

---

## 📝 MetaFormV2

**Location**: `MetaFormV2.tsx`

Production-ready form engine built with:
- **react-hook-form** - Type-safe form state
- **Zod** - Runtime schema validation
- **shadcn/ui Form components** - Accessible inputs
- **Auto-schema generation** - Zod schema from MetaField rules

### Features

✅ **Auto-validation** - Generates Zod schema from field definitions  
✅ **Grouped fields** - Renders fields in Card-wrapped groups  
✅ **Tabbed layout** - Multi-tab forms with shadcn Tabs  
✅ **10+ field types** - String, email, enum, boolean, date, relation, etc.  
✅ **Toast notifications** - Success/error feedback with Sonner  
✅ **Permission-aware** - Respects field-level permissions  
✅ **Type-safe** - Full TypeScript coverage  

### Usage

```tsx
import { MetaFormV2 } from "~/renderers/MetaFormV2";

<MetaFormV2
  model="partners"
  mode="create"
  onSuccess={(created) => navigate(`/partners/${created.id}`)}
  onCancel={() => navigate("/partners")}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `model` | `string` | Model name |
| `mode` | `"create" \| "edit"` | Form mode |
| `recordId` | `string` | Required for edit mode |
| `onSuccess` | `(record) => void` | Callback after successful save |
| `onCancel` | `() => void` | Callback when user cancels |

### Field Types

Supports all MetaField types:
- `string`, `email`, `url`, `phone`
- `integer`, `float`, `currency`
- `boolean`
- `enum` (with color-coded options)
- `date`, `datetime`
- `many2one`, `one2many`

### Validation

Auto-generates Zod schema from:
- `field.required` → `.min(1)` or `.refine()`
- `field.type === "email"` → `.email()`
- `field.type === "url"` → `.url()`
- `field.type === "integer"` → `.int()`
- `field.options` (enum) → `.enum()`

### Layout

Respects `MetaFormView.layout`:
- **Groups** → Card-wrapped sections
- **Tabs** → Tabbed interface

---

## 🎨 Design System

All renderers use:
- **Tailwind CSS v4** - Utility-first styling with `@theme` syntax
- **shadcn/ui** - Nova preset (Radix primitives + CVA)
- **Light/Dark theme** - Automatic with ThemeProvider
- **Accessible** - ARIA labels, keyboard navigation
- **Responsive** - Mobile-first design

### Color Tokens

```css
--color-background
--color-foreground
--color-primary
--color-secondary
--color-muted
--color-accent
--color-destructive
--color-border
--color-input
--color-ring
--color-chart-{1..5}
```

### Spacing

Uses Tailwind's default spacing scale: `0`, `px`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, ..., `96`

### Border Radius

```css
--radius-sm: 0.25rem
--radius-md: 0.5rem
--radius-lg: 0.75rem
--radius-xl: 1rem
```

---

## 🚀 Next Steps

- **API Security** - JWT auth + rate limiting (P0)
- **MetaKanban** - Drag-and-drop board with dnd-kit (P2)
- **MetaDashboard** - Chart.js/Recharts widgets (P2)
- **Shared UI Package** - Extract to `packages/ui` for reuse (P2)

---

**Built with ❤️ by the AFENDA team**
