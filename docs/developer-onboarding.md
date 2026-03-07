# Developer Onboarding — AetherTrack SaaS
> Version: 2.0

---

## Welcome

This document gets you from zero to productive on the AetherTrack frontend codebase in under 30 minutes.

---

## Quick Start

```bash
# 1. Install frontend dependencies
cd frontend
npm install

# 2. Copy environment variables
cp .env.example .env.local    # set VITE_API_URL

# 3. Start the dev server
npm run dev
# → http://localhost:3000
```

---

## Project Structure at a Glance

The repository uses a **feature-based architecture**. Every directory name tells you what business domain the code belongs to:

```
src/
├── app/       ← App shell: providers, routes, root layouts
├── features/  ← Business domains: auth, tasks, hr, projects…
├── shared/    ← UI primitives and utilities used by multiple features
└── styles/    ← Global CSS
```

See [folder-structure.md](./folder-structure.md) for the full annotated tree.

---

## First Things to Know

### 1. Path Aliases

Never use relative paths like `../../components/Button`.  
Always use the `@/` alias:

```js
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Tasks } from '@/features/tasks';  // via public barrel
```

| Alias | Meaning |
|---|---|
| `@/` | `src/` |
| `@features/` | `src/features/` |
| `@shared/` | `src/shared/` |
| `@app/` | `src/app/` |
| `@components/` | `src/shared/components/` |
| `@hooks/` | `src/shared/hooks/` |
| `@utils/` | `src/shared/utils/` |

### 2. Feature Isolation

Feature A must never import from inside Feature B. Use the barrel `index.js`:

```js
// ✅ OK — importing via public API
import { TaskCard } from '@/features/tasks';

// ❌ Wrong — reaching into feature internals
import TaskCard from '@/features/tasks/components/TaskCard';
```

### 3. Shared vs Feature

| Put it in `shared/` when... | Put it in `features/` when... |
|---|---|
| Used by 2+ features | Only used in one domain |
| Pure utility (no domain logic) | Tightly coupled to domain data |
| Generic UI primitive | Domain-specific visual element |

---

## Key Files

| File | Purpose |
|---|---|
| `src/App.jsx` | All route definitions |
| `src/main.jsx` | React entry point, CSS imports |
| `src/app/providers/AppProviders.jsx` | Wraps the whole app with all contexts |
| `src/app/routes/ProtectedRoute.jsx` | Role-based route guard |
| `src/features/auth/context/AuthContext.jsx` | Auth state: user, login, logout |
| `src/shared/services/axios.js` | Pre-configured Axios instance with interceptors |

---

## Adding a New Page

1. **Identify the feature domain** this page belongs to.
2. **Create the page file** in `features/[domain]/pages/YourPage.jsx`.
3. **Export it** from the feature's `index.js`.
4. **Add a route** in `src/App.jsx` using a lazy import:
   ```jsx
   const YourPage = lazy(() => import('@/features/[domain]/pages/YourPage'));
   // then inside Routes:
   <Route path="/your-path" element={<ProtectedRoute><YourPage /></ProtectedRoute>} />
   ```
5. **Add it to navigation** in `shared/constants/pages.json`.

---

## Adding a New Feature

1. Create `features/[name]/` with at minimum `pages/` and `index.js`.
2. Add the domain's routes to `App.jsx`.
3. Export the public API from `index.js`.
4. Move any cross-cutting concerns to `shared/`.

See [feature-guidelines.md](./feature-guidelines.md) for full rules.

---

## Making API Calls

All HTTP requests go through the shared Axios instance:

```js
import api from '@/shared/services/axios';

// Inside a hook or service:
const { data } = await api.get('/tasks');
await api.post('/tasks', { title: 'New Task' });
```

The instance automatically attaches the `Authorization` header from `tokenStore` and handles 401 token refresh.

---

## Authentication

Authentication state is managed in `AuthContext`:

```js
import { useAuth } from '@/features/auth/context/AuthContext';

const { user, login, logout, loading } = useAuth();
```

`user.role` is one of: `admin`, `hr`, `team_lead`, `member`.

Use `ProtectedRoute` to guard routes:
```jsx
<ProtectedRoute allowedRoles={['admin', 'hr']}>
  <AdminPage />
</ProtectedRoute>
```

---

## Theming

Theme state (light/dark/system) is managed in `ThemeProvider`.

```js
import { useTheme } from '@/app/providers/ThemeProvider';

const { theme, setTheme } = useTheme();
```

Active theme is applied via `data-theme` attribute on `<html>`. All design tokens are in `styles/design-tokens.css`.

---

## Common Patterns

### Component with loading state
```jsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  api.get('/endpoint')
    .then(res => setData(res.data))
    .finally(() => setLoading(false));
}, []);

if (loading) return <PageLoader />;
```

### Optimistic update
```js
import { useOptimisticUpdate } from '@/shared/hooks/useOptimisticUpdate';
```

### Real-time sync
```js
import useRealtimeSync from '@/shared/hooks/useRealtimeSync';
```

---

## Code Quality Rules

- Components must stay under **300 lines**. Extract logic to hooks, extract sub-UI to components.
- Never commit `console.log` to production branches.
- Use the `cn()` utility for conditional class names: `import { cn } from '@/shared/utils/cn'`
- Lint before committing: `npm run lint`
- Build before pushing: `npm run build`
