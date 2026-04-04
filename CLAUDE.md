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
- API calls → `services/<domain>/`
- Reusable UI primitives → `shared/ui/`

Never skip layers or import upward (e.g. `shared` must not import from `features`).

### Layer hierarchy (FSD — lower layers cannot import from higher)

| Layer | Path | Purpose |
|-------|------|---------|
| `shared/` | Infrastructure | UI primitives, providers, hooks, utils, event bus, styles |
| `entities/` | Domain models | Types and forms for `user`, `wish`, `wishlist` |
| `features/` | User interactions | Each feature has a `model.ts` (hook) + `ui/` (modal/form) |
| `widgets/` | Page composites | `Header`, `WishCard`, `WishlistCard`, `WishlistList` |
| `services/` | API layer | Thin fetch wrappers that call Next.js API routes |
| `app/` | Pages & routes | App Router pages + `/api` route handlers |

### Data flow

1. A **feature hook** (e.g. `useAddWishModel`) holds local form state and calls a **service** (e.g. `services/wish/addWish.ts`).
2. Services call internal Next.js API routes via `fetch` (POST `/api/wishlist`, etc.).
3. API routes read/write **Vercel KV**.
4. Cross-component communication uses the **Event Bus** (`shared/eventBus`) — a singleton pub/sub with typed events defined in `shared/eventBus/config/eventTypes.ts`. Example: `wishlist:openCreationModal` fires from the header to open a modal rendered elsewhere.

### Styling

CSS Modules per component. Global tokens in `shared/styles/variables.css`. No utility-class framework.

### Path aliases (`tsconfig.json`)

`@/*` maps to `src/*` — use this for all internal imports.
