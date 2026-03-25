# State Management Architecture

## Overview
This application uses a **hybrid state management approach** optimized for scalability from mid-size to ERP-scale applications.

## Architecture Decision Record (ADR)

### Decision
Use three complementary state management solutions:
- **Zustand**: UI state (sidebar, modals, notifications)
- **Redux Toolkit**: Business logic (auth, permissions, workflows)
- **React Query**: Server state (API data, caching)

### Context
As a metadata-driven ERP-like application, we need:
- Fast, lightweight UI state management
- Standardized patterns for complex business flows
- Efficient server data caching and synchronization
- Team scalability and maintainability

### Rationale

| Tool | Purpose | Bundle Size | Best For |
|------|---------|-------------|----------|
| **Zustand** | UI State | ~3kb | Sidebar, modals, tooltips, filters |
| **Redux Toolkit** | Business Logic | ~8kb | Auth, RBAC, workflows, audit |
| **React Query** | Server Data | ~13kb | API calls, caching, refetching |

#### Why This Combination?
1. **Zustand** - Minimal boilerplate for simple UI state that changes frequently
2. **Redux** - Standardized patterns for cross-cutting business concerns
3. **React Query** - Industry best practice for server state management

### Decision Matrix

| State Type | Tool | Examples | Rationale |
|------------|------|----------|-----------|
| **UI State (local)** | Zustand | Sidebar open/close, modal visibility, notifications | Fast, no middleware needed, minimal re-renders |
| **Theme State (compatibility layer)** | React Context | theme, resolvedTheme | App-wide theme state is centralized in app ThemeProvider for UI-library compatibility |
| **UI State (global)** | Zustand | Notification count, command palette, layout preferences | Centralized but lightweight |
| **Business Logic** | Redux | Auth status, user permissions, approval workflows | Needs middleware (audit, logging), predictable patterns |
| **Server Data** | React Query | Modules, models, metadata, records | Automatic caching, background refetching, optimistic updates |
| **Module-Specific UI** | Zustand | Filters in Inventory, view modes in CRM | Scoped to module, prevents global pollution |
| **Cross-Module State** | Redux | Multi-step workflows spanning modules | Needs central coordination |

### Implementation Rules

#### Rule 1: State Ownership
- **Never duplicate state** across multiple tools
- **Single source of truth** for each piece of state
- **Derive** computed values, don't store them

#### Rule 2: When to Use What

**Use Zustand when:**
- State is UI-related (visibility, layout, filters)
- No middleware needed (logging, auditing)
- Fast updates required (60fps animations)
- Scoped to single feature/module

**Use Redux when:**
- State affects business logic (auth, permissions)
- Middleware required (audit trail, analytics)
- Team needs standardized patterns
- State shared across many modules

**Use React Query when:**
- Data comes from API
- Caching needed
- Background sync required
- Optimistic updates desired

#### Rule 3: Folder Structure

```
stores/
├── README.md                    # This file
├── ui/                          # Zustand stores
│   ├── sidebar-store.ts
│   ├── notification-store.ts
│   └── modal-store.ts
├── business/                    # Redux Toolkit
│   ├── store.ts                 # Root store
│   ├── slices/
│   │   ├── auth-slice.ts
│   │   └── permissions-slice.ts
│   └── middleware/
│       ├── audit-logger.ts
│       └── analytics.ts
└── server/                      # React Query (moved from lib/)
    ├── query-client.ts
    └── query-keys.ts
```

#### Rule 4: Testing Requirements
- All Zustand stores must have unit tests
- Redux slices must test reducers and selectors
- React Query hooks must test loading/error states

#### Rule 5: Performance Guidelines
- Zustand: Use selectors to prevent unnecessary re-renders
- Redux: Use `createSelector` for derived state
- React Query: Set appropriate `staleTime` per query

### CI Gates

#### Automated Checks
1. **ESLint Rules**
   - No `useState` for global state
   - No prop drilling beyond 2 levels
   - Must use store selectors, not direct access

2. **Type Safety**
   - All stores must have TypeScript interfaces
   - No `any` types in store definitions

3. **Test Coverage**
   - Stores: 80% coverage required
   - Selectors: 100% coverage required

4. **Bundle Analysis**
   - Monitor store bundle sizes
   - Alert if stores exceed size limits

### Migration Path

#### Phase 1: Foundation (Current)
- [x] React Query setup
- [x] Theme context
- [x] Local state in components

#### Phase 2: Zustand (Immediate - Sprint 1)
- [x] Install Zustand
- [x] Create UI stores (sidebar, notifications)
- [x] Refactor TopBar and AppShell
- [x] Add store tests

#### Phase 3: Redux (When Needed - Sprint 2-3)
- [x] Install Redux Toolkit
- [x] Create auth slice
- [x] Add permissions slice
- [x] Implement audit middleware

#### Phase 4: Scale (ERP Growth)
- [ ] Module-specific stores
- [ ] Workflow engine
- [ ] Multi-tenant support

### Examples

#### Good ✅
```tsx
// Zustand for UI state
const { isOpen, toggle } = useSidebarStore();

// Redux for business logic
const user = useSelector((state) => state.auth.user);

// React Query for server data
const { data: modules } = useModules();
```

#### Bad ❌
```tsx
// ❌ Don't use useState for global state
const [sidebarOpen, setSidebarOpen] = useState(false);

// ❌ Don't duplicate server data in Redux
dispatch(setModules(modules)); // Already in React Query!

// ❌ Don't use Zustand for business logic
const { user, setUser } = useAuthStore(); // Use Redux!
```

### Consequences

#### Positive
- Clear separation of concerns
- Optimal bundle size
- Team scalability
- Enterprise-ready

#### Negative
- Three tools to learn (mitigated by clear rules)
- More initial setup (pays off long-term)

### Related Documents
- Enterprise Enrichment Progress (in repo memory)
- Architecture Overview (in repo memory)

### References
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [TanStack Query Documentation](https://tanstack.com/query)

---

**Last Updated**: March 24, 2026  
**Status**: Phase 2 - Zustand Implementation  
**Reviewers**: Architecture Team
