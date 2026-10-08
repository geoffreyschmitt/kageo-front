# Architecture

Kageo is a Next.js 16 App Router app, structured with Feature-Sliced Design, storing everything in Vercel KV and deployed on Vercel. See `CLAUDE.md` for layer rules and conventions; this file covers structure, data and integrations.

## Overview

```
Browser ──► Next.js (Vercel)
             ├─ proxy.ts               next-intl locale routing (fr default, en)
             ├─ app/[locale]/**        server pages: read KV directly, hand data to views/
             ├─ app/api/**/route.ts    route handlers: auth check → KV read/write
             └─ sw.ts (Serwist)        PWA service worker, /~offline fallback
                         │
                         ▼
                 Vercel KV (Upstash Redis)      Resend (email)      Google OAuth
```

There is no separate backend or SQL database. Route handlers are the only writers of KV (plus NextAuth callbacks, which create Google users).

## Routes

Pages (under `app/[locale]/`): `/` (landing/dashboard), `/wishlists`, `/wishlist/[id]`, `/history`, `/profile`, `/u/[id]` (public profile), `/features`, `/~offline`.

API (`app/api/`):

| Route | Purpose |
|---|---|
| `auth/[...nextauth]`, `auth/register` | NextAuth; credentials sign-up |
| `user/me`, `user/password`, `user/stats`, `user/export` | Account info (incl. optional birthdate), `DELETE` = full account purge, password change, dashboard stats, data export |
| `wishlist` , `wishlist/[id]` | Wishlist CRUD |
| `wishlist/share` | Invite by email (adds invitee; email not yet sent) |
| `wishlist/pot`, `wishlist/contribute` | Wishlist-level pot; `PATCH` replaces the caller's pledge, `amount: 0` cancels |
| `wishlist/pot/export`, `wish/pot/export` | Pledges as CSV; pot organiser only |
| `wishlist/[id]/comments`, `wish/[wishId]/comments` | Comments |
| `wish`, `wish/[wishId]` | Wish create / read / update |
| `wish/reserve`, `cancel`, `mark-purchased`, `remove-purchased`, `delete` | Wish state transitions |
| `wish/pot`, `wish/contribute` | Per-wish gift pot |

Every handler resolves the caller with `getServerSession(authOptions)` (`shared/config/authOptions.ts`).

## Auth

NextAuth v4, JWT sessions (no session store). Providers: Credentials (email + bcrypt) and Google. Google sign-in auto-creates a KV user on first login. `token.id` carries the user id into the session.

Access to a wishlist is decided by `shared/lib/wishlistAccess.ts`: owner, public, or invited (email in `wishlist:{id}:invitees`). The owner is resolved separately from `canView` so guest-only surfaces (comments, pots) can exclude the owner.

## Data model (Vercel KV)

All values are JSON unless noted. IDs are UUIDs.

| Key | Type | Content |
|---|---|---|
| `user:{email}` | value | `{id, email, name, password(hash), provider, createdAt, isPublic?, birthdate?}` (email lowercased) |
| `user:id:{id}` | value | email (reverse lookup) |
| `user:{id}:wishlists` | set | wishlist ids owned by the user |
| `email:{email}:invitedWishlists` | set | wishlists an email was invited to (works before the invitee has an account) |
| `wishlist:{id}` | value | `TWishlist` (name, description, isPublic, eventDate, allowSuggestions, coverImage?, ownerId, timestamps) |
| `wishlist:{id}:wishes` | set | wish ids |
| `wishlist:{id}:invitees` | set | invited emails |
| `wishlist:{id}:pot` | value | wishlist-level pot (creator, target) |
| `wishlist:{id}:contributions` | list | pledge entries `{userId, amount, contributedAt}` |
| `wishlist:{id}:comments` | list | `TComment` |
| `wish:{id}` | value | wish (name, description, url, priority, status, reserver/purchaser ids, …) |
| `wish:{id}:pot` | value | per-wish gift pot (goal is the wish's price, never stored) |
| `wish:{id}:contributions` | list | pledge entries |
| `wish:{id}:comments` | list | `TComment` |
| `lock:{key}` | value | short-lived (10 s TTL) mutex held by `withLock` (`shared/lib/kvLock.ts`) around any read-modify-write of a record; `lock:wish:{id}` or `lock:wishlist:{id}`. Excluded from backups |

Wish status: `wanted` · `reserved` · `purchased` · `proposed` · `funded`. `funded` is set by `reconcileFundedStatus` on every contribution write; the organiser may override to `purchased`. Priority: `low` · `medium` · `high`.

Deleting a wishlist, wish or account must also delete every sub-key and back-reference. This is centralised in `shared/lib/kvCascade.ts` (`wishKeys`, `wishlistKeys`, `queueWishlistDeletion`) and runs inside `kv.multi()` transactions; account deletion is `app/api/user/me/purgeUser.ts`. When you add a key under `wish:{id}` or `wishlist:{id}`, add it to those lists.

**Visibility rules**: pots and comments never reach the wishlist owner (surprise). Role-shaped pot payloads are built in one place, `app/api/wishlist/pot/readPot.ts`.

## Frontend structure

FSD layers in `src/`: `shared → entities → features → widgets → views → app`. Cross-component UI signals go through the typed event bus (`shared/eventBus`). Theme (light/dark) is a cookie read server-side (`shared/theme`) plus an init script to avoid flash. Translations live in `shared/i18n/messages/{fr,en}.json`.

## Integrations

| Service | Use | Notes |
|---|---|---|
| Vercel KV | all persistence | `KV_REST_API_*`, `KV_URL`, `REDIS_URL` |
| Google OAuth | sign-in | `GOOGLE_CLIENT_ID/SECRET` |
| Resend | not used yet (planned for invite emails) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Serwist | PWA / offline | disabled in development; needs the webpack build (`npm run build` uses `--webpack`) |

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `NEXTAUTH_SECRET` | yes | JWT signing |
| `NEXTAUTH_URL` | yes | canonical URL |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, `REDIS_URL` | yes | Vercel KV (provisioned by the integration) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | yes | Google sign-in |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | not yet | reserved for invite emails |
| `NEXT_PUBLIC_APP_URL` | no | used when building share URLs |

Local values come from `.env.local` (created by the Vercel CLI; never commit it). Project is linked via `.vercel/`; origin is `geoffreyschmitt/kageo-front` on GitHub.

## Known architectural debt

- Route, page and logic tests (Vitest, in-memory KV) cover wish and wishlist CRUD, access rules, comments, share, pots, pledges, races, CSV, account routes, the account purge and the server pages; `e2e/` has Playwright flows against the in-memory KV. Lint passes clean.
- Every route that rewrites a wish or wishlist record (edit, delete, reserve, cancel, mark/remove purchased, pledges, gift-pot creation, the account purge's pot and reservation changes) holds `withLock` on that record and re-reads it inside the lock (`SET NX EX`, since `@vercel/kv` is stateless REST and has no `WATCH`). A contended record answers 503. Not locked: comment lists (append-only `rpush`, but the purge rewrites them), wishlist creation/sharing, and cross-record operations such as deleting a wishlist while a pledge lands on one of its wishes. Account purge scans keys (O(keys)). Sessions are stateless JWTs, so a deleted account's cookie still passes `getServerSession` until it expires; routes that only check the session id would then act for a user who no longer exists.
