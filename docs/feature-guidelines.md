# Feature Module Guidelines — AetherTrack SaaS
> Version: 2.0

---

## 1. What is a Feature Module?

A feature module is a **self-contained unit** representing one business capability of the application. Examples: `auth`, `tasks`, `hr`, `analytics`.

Each feature module:
- Has a single root directory under `features/`
- Exposes exactly one public API via `index.js`
- Contains **all** code specific to that domain
- Has **no** direct internal imports from other features

---

## 2. Standard Feature Structure

```
features/[feature-name]/
│
├── components/        ← UI components specific to this feature
├── hooks/             ← Custom React hooks for this feature
├── pages/             ← Routed page components
├── services/          ← API calls, data fetchers
├── store/             ← Feature-level state (Zustand/Redux slice)
├── types/             ← TypeScript interfaces or JSDoc typedefs
├── utils/             ← Feature-specific utility functions
└── index.js           ← PUBLIC API — the only allowed import entry point
```

Not every directory is required. Only create what exists.

---

## 3. Public API (index.js)

Every feature **must** have an `index.js` that explicitly exports its public surface:

```js
// features/tasks/index.js
export { default as Tasks } from './pages/Tasks';
export { default as Kanban } from './pages/Kanban';
export { default as TaskCard } from './components/TaskCard';
export { default as useDragAndDrop } from './hooks/useDragAndDrop';
export * from './services/taskService';
```

**Rules:**
- Only export what other features or `app/` actually need
- Internal helpers should NOT be exported
- Never import from `features/X/internal/something` in another feature

---

## 4. Feature Isolation Rules

```
✅ Allowed
  features/tasks → @/shared/components/ui/Button
  features/tasks → @/shared/hooks/useDebounce
  features/tasks → @/shared/services/axios
  app/routes     → @/features/tasks (via barrel only)

❌ Forbidden
  features/tasks   → features/projects/services/projectsApi      (cross-feature internal)
  features/hr      → features/workspace/context/SidebarContext    (cross-feature internal)
  shared/          → features/*/                                   (shared depends on features)
```

To share data with another feature, move the shared concern to `shared/` and have both features import from there.

---

## 5. Component Size Guidelines

| Type | Max Lines | Rule |
|---|---|---|
| Page component | 300 | Extract sub-components and hooks |
| Feature component | 200 | Extract if rendering + logic > 150 lines |
| Shared UI component | 150 | Must be purely presentational |
| Hook | 100 | Split into smaller hooks if exceeding |

When a page component exceeds 300 lines:
1. Extract each modal/panel into its own component file
2. Extract data-fetching logic into a `use[Feature]Data.js` hook
3. Extract filtering/sorting logic into `use[Feature]Filters.js`

---

## 6. Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Page components | PascalCase | `ProjectDashboard.jsx` |
| Feature components | PascalCase | `TaskCard.jsx` |
| Custom hooks | camelCase with `use` prefix | `useDragAndDrop.js` |
| Services | camelCase | `projectsApi.js` |
| Utility functions | camelCase | `ganttNormalization.js` |
| CSS modules | kebab-case | `task-card.module.css` |
| Types/interfaces | PascalCase | `TaskType`, `UserProfile` |
| Constants | UPPER_SNAKE_CASE | `MAX_TASKS_PER_PAGE` |
| Index/barrel | always `index.js` | `features/tasks/index.js` |

---

## 7. Adding a New Feature

1. Create the feature directory:
   ```
   features/[your-feature]/
   ├── pages/
   ├── index.js
   ```

2. Implement the minimal required internal structure for the domain.

3. Export the public API from `index.js`.

4. Add routes to `App.jsx` using the `@/features/[name]` alias.

5. If functionality is used by more than one feature, move it to `shared/`.

---

## 8. Moving Code to Shared

Move code to `shared/` when:
- **Two or more** features need the same function, component, or hook
- The code has no domain-specific business logic
- The code is a pure utility (e.g., date formatter, class name helper)

Do **not** move to `shared/`:
- Components with domain-specific prop shapes
- Hooks that call domain APIs
- Logic that only makes sense in one context

---

## 9. Testing Strategy

Each feature should contain its own `__tests__/` directory:

```
features/tasks/
└── __tests__/
    ├── Tasks.test.jsx
    ├── TaskCard.test.jsx
    └── useDragAndDrop.test.js
```

For shared utilities, tests live alongside the source:
```
shared/utils/
├── dateNormalization.js
└── dateNormalization.test.js
```
