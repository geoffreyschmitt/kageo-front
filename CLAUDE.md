# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository. Deeper context lives in `docs/`:
[product](docs/product.md) · [architecture](docs/architecture.md) · [roadmap](docs/roadmap.md).
Read `product.md` before making product decisions, `architecture.md` before touching data or auth.

## Commands

```bash
npm run dev       # Dev server (Turbopack)
npm run build     # Production build (webpack, so Serwist emits sw.js) — THE verification gate (type-checks everything)
npm start         # Serve the production build
npm test          # Vitest unit tests (pot logic, CSV, account purge)
npm run lint      # ESLint, 0 errors expected (warnings are known debt)
npm run test:e2e  # Playwright on Turbopack dev with an in-memory KV (no database needed)
```

- **Use `npm`, not `pnpm`** — pnpm isn't on PATH in Claude's shell here (a `package-lock.json` is committed).
- Lint works again (native flat config). Import-order and a few React 19 rules are warnings, not errors.
- Tests are Vitest unit tests next to the code (`*.test.ts`); `src/test/fakeKv.ts` is an in-memory KV for route logic. `e2e/` holds Playwright specs that run the real app against the in-memory KV (`E2E_FAKE_KV=1`, see `playwright.config.ts`); they never touch a database. Concurrency tests build the fake with `createFakeKv({ latency: true })`.
- Windows + PhpStorm: `mv` can fail with "Permission denied" while the IDE is open — use PowerShell `Move-Item`/`Rename-Item`.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · CSS Modules · NextAuth v4 (Credentials + Google, JWT) ·
Vercel KV (Upstash Redis) · next-intl (`fr` default, `en`) · Serwist PWA · Resend (email) · deployed on Vercel.

## Architecture (FSD)

Feature-Sliced Design. Lower layers never import from higher ones; never skip layers.

| Layer | Path | Purpose |
|-------|------|---------|
| `shared/` | `src/shared` | UI primitives, providers, hooks, lib, event bus, API wrappers, i18n, theme, styles |
| `entities/` | `src/entities` | Domain types/forms: `user`, `wish`, `wishlist`, `comment` |
| `features/` | `src/features` | One user interaction each: `model.ts` (hook) + `ui/` |
| `widgets/` | `src/widgets` | Composites: `Header`, `WishCard`, `WishlistCard`, `WishlistList`, `PotCard`, `GiftPotSection` |
| `views/` | `src/views` | Full-page client components (`dashboard`, `wishlist`, `profile`, `publicProfile`). This is FSD's "pages" layer, renamed to avoid clashing with Next's `pages/` |
| `app/` | `src/app` | Routes under `[locale]/`, plus `/api` route handlers |

Where new code goes:
- Business logic/state → `features/<Name>/model.ts`; UI → `features/<Name>/ui/`
- Domain types → `entities/<domain>/`
- Fetch wrappers → `shared/api/<domain>/`
- Reusable primitives → `shared/ui/`

### Data flow

1. A feature hook (e.g. `useAddWishModel`) holds form state and calls an API wrapper in `shared/api/**`.
2. The wrapper `fetch`es an internal route handler in `app/api/**/route.ts`.
3. The handler authenticates with `getServerSession(authOptions)` and reads/writes Vercel KV (`@vercel/kv`).
4. Cross-component communication uses the **event bus** (`shared/eventBus`): a typed singleton pub/sub, events declared in `shared/eventBus/config/eventTypes.ts` (e.g. `wishlist:openCreationModal`, `wish:openComments`).

Server pages (`app/[locale]/**/page.tsx`) may read KV directly and pass data to a `views/` client component.

### Conventions and gotchas

- Imports use the `@/*` → `src/*` alias.
- Styling: CSS Modules per component; global tokens in `shared/styles/variables.css`; light/dark themes in `shared/styles/theme.css`. No utility-class framework.
- **i18n**: every user-visible string goes in **both** `shared/i18n/messages/fr.json` and `en.json`. Use the navigation helpers from `shared/i18n/navigation.ts`, not `next/link`.
- **Display font is Fraunces**, bound to the `--font-cormorant` CSS var (the var name is historical). Do not reintroduce Cormorant Garamond.
- **Pots are a surprise from the wishlist owner.** Both pot types are hidden from the owner; role-shaped payloads come from one place (`readPotForViewer` / `readGiftPot` in `app/api/wishlist/pot/readPot.ts`). Don't re-derive role rules in the UI.
- Two pot surfaces coexist: wishlist-level `PotCard` and per-wish `GiftPotSection` (the wish's goal is its price, never stored).
- The old `lib/mock*.ts` / `useMock` layer is gone; don't add mocks. Read-modify-write on a wish or wishlist goes through `withLock(wishLock(id) | wishlistLock(id))` (`shared/lib/kvLock.ts`) and re-reads the record inside the lock. Multi-key KV writes go through `kv.multi()` (see `shared/lib/kvCascade.ts`); account deletion is `app/api/user/me/purgeUser.ts`.
- `src/proxy.ts` is the next-intl locale proxy (Next 16's name for middleware).
- Env vars and KV key schema: see `docs/architecture.md`.

## Docs maintenance

When you ship a user-visible feature or change the data model, update the matching doc in the same change:
`docs/roadmap.md` (move the item), `docs/architecture.md` (new KV keys/routes). Feature specs/plans from
the superpowers workflow live in `docs/superpowers/{specs,plans}/`.

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
