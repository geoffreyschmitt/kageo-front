# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev          # Start dev server with Turbopack
pnpm build        # Production build
pnpm start        # Start production server

# Linting
pnpm lint         # Check for ESLint errors
pnpm lint:fix     # Auto-fix ESLint errors
pnpm format       # Format src/**/*.{ts,tsx} via ESLint fix
```

There is no test runner configured in this project.

## Architecture

Kageo is a wishlist management app built on **Next.js App Router** following **Feature-Sliced Design (FSD)**. Backend storage is **Vercel KV** (Redis). Auth is **NextAuth v4** with a Credentials provider and bcrypt password hashing.

### Implementing new features

Always follow FSD when adding functionality. Place new code in the appropriate layer:
- Business logic and state → `features/<FeatureName>/model.ts` (custom hook)
- UI for the feature → `features/<FeatureName>/ui/`
- Reusable domain types/forms → `entities/<domain>/`
- API calls → `shared/api/<domain>/`
- Reusable UI primitives → `shared/ui/`

Never skip layers or import upward (e.g. `shared` must not import from `features`).

### Layer hierarchy (FSD — lower layers cannot import from higher)

| Layer | Path | Purpose |
|-------|------|---------|
| `shared/` | Infrastructure | UI primitives, providers, hooks, utils, event bus, api wrappers, styles |
| `entities/` | Domain models | Types and forms for `user`, `wish`, `wishlist` |
| `features/` | User interactions | Each feature has a `model.ts` (hook) + `ui/` (modal/form) |
| `widgets/` | Page composites | `Header`, `WishCard`, `WishlistCard`, `WishlistList` |
| `pages/` | Page components | Full-page client components (e.g. wishlist detail) |
| `app/` | Pages & routes | App Router pages + `/api` route handlers |

### Data flow

1. A **feature hook** (e.g. `useAddWishModel`) holds local form state and calls an **API wrapper** (e.g. `shared/api/wish/addWish.ts`).
2. API wrappers call internal Next.js App Router route handlers via `fetch`.
3. Route handlers (`app/api/**\/route.ts`) authenticate via `getServerSession(authOptions)` and read/write **Vercel KV**.
4. Cross-component communication uses the **Event Bus** (`shared/eventBus`).
4. Cross-component communication uses the **Event Bus** (`shared/eventBus`) — a singleton pub/sub with typed events defined in `shared/eventBus/config/eventTypes.ts`. Example: `wishlist:openCreationModal` fires from the header to open a modal rendered elsewhere.

### Styling

CSS Modules per component. Global tokens in `shared/styles/variables.css`. No utility-class framework.

### Path aliases (`tsconfig.json`)

`@/*` maps to `src/*` — use this for all internal imports.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
