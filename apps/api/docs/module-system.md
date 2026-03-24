# Module System Documentation

## Overview

The AFENDA Meta-UI module system provides a pluggable architecture for organizing and extending the application. Modules can define models, routes, menus, actions, widgets, and lifecycle hooks.

## Architecture

```
apps/api/src/
├── modules/
│   └── sales/
│       └── index.ts         # Sales module definition
├── meta/
│   ├── moduleRegistry.ts    # Module discovery & loading
│   └── registry.ts          # Model metadata storage
└── routes/
    └── meta.ts              # API endpoints for modules

packages/meta-types/src/
└── module.ts                # TypeScript type definitions

apps/web/src/
├── hooks/
│   └── useModules.ts        # React hook for fetching modules
└── components/layout/
    └── sidebar.tsx          # Dynamic sidebar navigation
```

## Core Concepts

### 1. MetaModule

A module is defined by the `MetaModule` interface:

```typescript
interface MetaModule {
  // Module identity
  name: string;           // Unique identifier (e.g., "sales")
  label: string;          // Display name (e.g., "Sales")
  version: string;        // Semantic version (e.g., "1.0.0")
  description?: string;
  author?: string;
  category: ModuleCategory;  // core, erp, crm, inventory, finance, custom
  icon?: string;          // Lucide icon name

  // Dependencies
  depends?: string[];     // Module names this module depends on

  // Configuration
  config?: ModuleConfig;

  // Module components
  models?: ModelDefinition[];
  routes?: RouteDefinition[];
  hooks?: ModuleHooks;
  actions?: ActionDefinition[];
  widgets?: WidgetDefinition[];
  menus?: MenuDefinition[];
}
```

### 2. Module Discovery

The `ModuleRegistry` class automatically discovers and loads modules from `apps/api/src/modules/`:

1. **Scan**: Reads the `modules/` directory for subdirectories
2. **Load**: Imports `index.ts` from each module directory
3. **Validate**: Checks if the module exports a valid `MetaModule` definition
4. **Register**: Adds the module to the registry and builds model mappings
5. **Resolve Dependencies**: Determines load order using topological sort

### 3. Lifecycle Hooks

Modules can define hooks that run at specific lifecycle events:

```typescript
interface ModuleHooks {
  // Module lifecycle
  onLoad?: () => void | Promise<void>;      // Module loaded
  onEnable?: () => void | Promise<void>;    // Module enabled
  onDisable?: () => void | Promise<void>;   // Module disabled
  onUnload?: () => void | Promise<void>;    // Module unloaded

  // CRUD lifecycle
  beforeCreate?: (model: string, data: any) => void | Promise<void>;
  afterCreate?: (model: string, record: any) => void | Promise<void>;
  beforeUpdate?: (model: string, id: any, data: any) => void | Promise<void>;
  afterUpdate?: (model: string, record: any) => void | Promise<void>;
  beforeDelete?: (model: string, id: any) => void | Promise<void>;
  afterDelete?: (model: string, id: any) => void | Promise<void>;
}
```

## Creating a Module

### Step 1: Define the Module

Create `apps/api/src/modules/mymodule/index.ts`:

```typescript
import type { MetaModule } from "@afenda/meta-types";

export default {
  name: "mymodule",
  label: "My Module",
  version: "1.0.0",
  description: "My custom module",
  author: "Your Name",
  category: "custom",
  icon: "Package",

  config: {
    enabled: true,
    settings: {},
    features: {},
  },

  models: [
    {
      name: "my_model",
      label: "My Model",
      visible: true,
      icon: "FileText",
    },
  ],

  menus: [
    {
      name: "my_model_menu",
      label: "My Model",
      path: "/mymodule/my_model",
      icon: "FileText",
      order: 1,
    },
  ],

  hooks: {
    onLoad: async () => {
      console.log("[MyModule] Loaded");
    },
  },
} as MetaModule;
```

### Step 2: Create the Database Schema

Add your tables to `apps/api/src/db/schema/mymodule.ts`:

```typescript
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const myModels = pgTable("my_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Step 3: Auto-Discovery

The module registry will automatically discover your module on server startup. No manual registration required!

## API Endpoints

### GET /meta/modules

Returns all registered modules:

```json
{
  "modules": [
    {
      "name": "sales",
      "label": "Sales",
      "version": "1.0.0",
      "category": "erp",
      "icon": "ShoppingCart",
      "models": [...],
      "menus": [...]
    }
  ]
}
```

### GET /meta/modules/:name

Returns a specific module:

```json
{
  "name": "sales",
  "label": "Sales",
  "version": "1.0.0",
  "description": "Core sales and partner management module",
  "author": "AFENDA",
  "category": "erp",
  "icon": "ShoppingCart",
  "config": {
    "enabled": true,
    "settings": {},
    "features": {}
  },
  "models": [
    {
      "name": "partner",
      "label": "Partners",
      "visible": true,
      "icon": "Users"
    }
  ],
  "menus": [
    {
      "name": "partners",
      "label": "Partners",
      "path": "/sales/partner",
      "icon": "Users",
      "order": 1
    }
  ]
}
```

### GET /meta/menus

Returns navigation menus for the sidebar:

```json
{
  "menus": [
    {
      "module": "sales",
      "label": "Sales",
      "icon": "ShoppingCart",
      "models": [
        {
          "name": "partner",
          "label": "Partners",
          "icon": "Users"
        },
        {
          "name": "sales_order",
          "label": "Sales Orders",
          "icon": "FileText"
        }
      ]
    }
  ]
}
```

## Frontend Integration

### Fetching Modules

Use the `useModules` hook in React components:

```typescript
import { useModules } from "@/hooks/useModules";

function Sidebar() {
  const { data: menus, isLoading, error } = useModules();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading modules</div>;

  return (
    <nav>
      {menus?.map((module) => (
        <div key={module.module}>
          <h3>{module.label}</h3>
          <ul>
            {module.models.map((model) => (
              <li key={model.name}>
                <Link to={`/${module.module}/${model.name}`}>
                  {model.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

### Icon Mapping

The sidebar maps string icon names to Lucide React components:

```typescript
import { ShoppingCart, Package, Users } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart,
  Package,
  Users,
  // Add more as needed
};

function getIcon(iconName?: string): LucideIcon {
  return ICON_MAP[iconName] || FileText;
}
```

## Dependency Resolution

Modules can depend on other modules. The registry uses topological sort to determine load order:

```typescript
// Module A depends on core
export default {
  name: "module_a",
  depends: ["core"],
  // ...
} as MetaModule;

// Module B depends on A
export default {
  name: "module_b",
  depends: ["module_a"],
  // ...
} as MetaModule;

// Load order: core → module_a → module_b
```

If a dependency is missing, the registry logs a warning but continues loading.

## Module Configuration

### Enable/Disable Modules

Set `config.enabled` to `false` to disable a module:

```typescript
export default {
  name: "sales",
  config: {
    enabled: false, // Module will not load
  },
  // ...
} as MetaModule;
```

### Module Settings

Store module-specific settings in `config.settings`:

```typescript
export default {
  name: "sales",
  config: {
    enabled: true,
    settings: {
      default_currency: "USD",
      tax_rate: 0.15,
      auto_approve_threshold: 1000,
    },
  },
  // ...
} as MetaModule;
```

### Feature Flags

Use `config.features` for feature toggles:

```typescript
export default {
  name: "sales",
  config: {
    enabled: true,
    features: {
      enable_quotes: true,
      enable_subscriptions: false,
      enable_multi_currency: true,
    },
  },
  // ...
} as MetaModule;
```

## Model Definitions

Each module can define models that appear in the UI:

```typescript
models: [
  {
    name: "partner",           // Database table name (snake_case)
    label: "Partners",         // Display name (plural)
    visible: true,             // Show in sidebar
    icon: "Users",             // Lucide icon name
  },
  {
    name: "sales_order_line",
    label: "Order Lines",
    visible: false,            // Not in sidebar (accessed via one2many)
    icon: "ListOrdered",
  },
]
```

The actual `ModelMeta` (fields, views, permissions) is loaded from the schema registry via introspection.

## Menu Definitions

Define navigation menus for your module:

```typescript
menus: [
  {
    name: "partners",
    label: "Partners",
    path: "/sales/partner",
    icon: "Users",
    roles: ["admin", "manager", "viewer"], // Optional: restrict by role
    order: 1,                              // Sort order
  },
  {
    name: "reports",
    label: "Sales Reports",
    path: "/sales/reports",
    icon: "BarChart",
    order: 10,
    children: [                            // Nested menu
      {
        name: "monthly",
        label: "Monthly Report",
        path: "/sales/reports/monthly",
        icon: "Calendar",
      },
    ],
  },
]
```

## Best Practices

### 1. Module Naming

- Use lowercase snake_case for module names
- Use descriptive, unique names (e.g., `sales`, `inventory`, `crm`)
- Avoid generic names like `module1` or `app`

### 2. Version Management

- Follow semantic versioning (`major.minor.patch`)
- Increment major version for breaking changes
- Increment minor version for new features
- Increment patch version for bug fixes

### 3. Dependencies

- Minimize dependencies to reduce coupling
- Declare all dependencies explicitly
- Avoid circular dependencies

### 4. Model Organization

- Group related models in the same module
- Mark child models as `visible: false` (e.g., order lines)
- Use descriptive labels and icons

### 5. Error Handling

- Handle errors gracefully in lifecycle hooks
- Log errors but don't crash the server
- Provide meaningful error messages

## Example: Sales Module

Full example of the built-in sales module:

```typescript
import type { MetaModule } from "@afenda/meta-types";

export default {
  name: "sales",
  label: "Sales",
  version: "1.0.0",
  description: "Core sales and partner management module",
  author: "AFENDA",
  category: "erp",
  icon: "ShoppingCart",

  config: {
    enabled: true,
    settings: {},
    features: {},
  },

  models: [
    {
      name: "partner",
      label: "Partners",
      visible: true,
      icon: "Users",
    },
    {
      name: "product",
      label: "Products",
      visible: true,
      icon: "Package",
    },
    {
      name: "sales_order",
      label: "Sales Orders",
      visible: true,
      icon: "FileText",
    },
    {
      name: "sales_order_line",
      label: "Order Lines",
      visible: false,
      icon: "ListOrdered",
    },
  ],

  menus: [
    {
      name: "partners",
      label: "Partners",
      path: "/sales/partner",
      icon: "Users",
      order: 1,
    },
    {
      name: "orders",
      label: "Sales Orders",
      path: "/sales/sales_order",
      icon: "FileText",
      order: 2,
    },
    {
      name: "products",
      label: "Products",
      path: "/sales/product",
      icon: "Package",
      order: 3,
    },
  ],

  hooks: {
    onLoad: async () => {
      console.log("[Sales Module] Loaded");
    },
    onEnable: async () => {
      console.log("[Sales Module] Enabled");
    },
    onDisable: async () => {
      console.log("[Sales Module] Disabled");
    },
  },
} as MetaModule;
```

## Troubleshooting

### Module Not Loading

1. Check console logs for errors during startup
2. Verify module exports `default` or named export `module`
3. Ensure `config.enabled !== false`
4. Check for TypeScript compilation errors

### Dependency Issues

1. Verify all dependencies are valid module names
2. Check for circular dependencies
3. Review load order in console logs

### Icons Not Showing

1. Add icon to `ICON_MAP` in sidebar.tsx
2. Use exact Lucide icon name (case-sensitive)
3. Fallback to `FileText` if icon not found

### Models Not Appearing

1. Ensure model is marked `visible: true`
2. Verify model exists in database schema
3. Check schema registry for model metadata
4. Run introspection CLI to regenerate metadata

## Future Enhancements

- [ ] Dynamic module installation (npm install)
- [ ] Module marketplace
- [ ] Version checking and updates
- [ ] Module settings UI
- [ ] Module dependency graph visualization
- [ ] Hot module reloading
- [ ] Module permissions per role
- [ ] Module conflicts detection
- [ ] Module migrations system
- [ ] Module testing framework

## Conclusion

The module system provides a powerful, flexible architecture for extending AFENDA Meta-UI. By defining modules, you can encapsulate functionality, manage dependencies, and create a pluggable application structure.

For questions or issues, refer to the main README or open an issue on GitHub.
