# KV Frontend Wiring — Design Spec

**Date:** 2026-08-23  
**Status:** Approved

---

## Problem

The Vercel KV (Upstash Redis) database and all API routes are fully implemented. However, the frontend pages use hardcoded sample data and mock users instead of fetching real data. This spec covers wiring three pages to real data.

The dashboard (`/`) already fetches from KV correctly and serves as the reference pattern.

---

## Scope

Three pages need updating:

| Page | Route | Current state |
|------|-------|---------------|
| Wishlists list | `/wishlists` | Hardcoded sample wishlists, mock user |
| Wishlist detail | `/wishlist/[id]` | Hardcoded sample items, mock user, client component |
| History | `/history` | Hardcoded sample wishlists, mock user |

---

## Approach

**Server components fetch directly from KV**, using `getServerSession(authOptions)` for auth and `kv` calls for data — the same pattern as `src/app/[locale]/page.tsx` (dashboard).

No fetch to own API routes from server components. The API routes remain for client-side mutations (reserve, delete, contribute, etc.) which already work via the shared API wrappers.

---

## Page Designs

### 1. `/wishlists` — `src/app/[locale]/wishlists/page.tsx`

**Current:** Client component, hardcoded data, mock user.  
**After:** Async server component.

Data fetching:
1. `getServerSession(authOptions)` — if no session, redirect to `/`
2. `kv.smembers(`user:${userId}:wishlists`)` → list of wishlist IDs
3. `Promise.all(ids.map(id => kv.get(`wishlist:${id}`)))` → wishlist objects
4. Filter out nulls, pass to existing list UI

No structural changes to child components.

---

### 2. `/history` — `src/app/[locale]/history/page.tsx`

**Current:** Client component, hardcoded data, mock user.  
**After:** Async server component.

Same fetch as `/wishlists`, with an additional filter:
- Keep only wishlists where `eventDate` is a past date (or no eventDate — treat as non-history)
- Pass `isHistory={true}` prop to wishlist cards

---

### 3. `/wishlist/[id]` — `src/app/[locale]/wishlist/[id]/page.tsx`

**Current:** `'use client'` component with all mutation state and hardcoded data.  
**After:** Split into server + client layers.

#### `page.tsx` → async server component

1. `getServerSession(authOptions)` → determine if logged in and who
2. `kv.get(`wishlist:${id}`)` → wishlist metadata
   - If not found → 404 (`notFound()`)
   - If private and not owner and not logged in → redirect to `/`
3. `kv.smembers(`wishlist:${id}:wishes`)` → wish IDs
4. `Promise.all(wishIds.map(id => kv.get(`wish:${id}`)))` → wish objects
5. Determine `userIsOwner = session?.user?.id === wishlist.ownerId`
6. Render `<WishlistPageClient>` with fetched data

#### New `WishlistPageClient.tsx` — client component

Extract the existing client logic from `page.tsx` into this component:
- All `useState` for items, totalContributed, userContributed
- All handlers (reserve, cancel, purchase, delete, add, propose, contribute)
- Renders `<Wishlist>` with real props (no `useMock`)

This component lives alongside `page.tsx` in `src/app/[locale]/wishlist/[id]/`.

---

## Auth / Access Rules

| Scenario | Behaviour |
|----------|-----------|
| `/wishlists` — not logged in | Redirect to `/` |
| `/history` — not logged in | Redirect to `/` |
| `/wishlist/[id]` — public, not logged in | Show guest view (read-only, no owner controls) |
| `/wishlist/[id]` — private, not logged in | Redirect to `/` |
| `/wishlist/[id]` — logged in, is owner | Show owner view |
| `/wishlist/[id]` — logged in, not owner | Show guest view |

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/[locale]/wishlists/page.tsx` | Rewrite as async server component |
| `src/app/[locale]/history/page.tsx` | Rewrite as async server component |
| `src/app/[locale]/wishlist/[id]/page.tsx` | Rewrite as async server component |
| `src/app/[locale]/wishlist/[id]/WishlistPageClient.tsx` | New — extract client logic from old page.tsx |

No changes to `src/views/wishlist/wishlist.tsx`, widgets, or API routes.

---

## Out of Scope

- Profile page (no KV data to fetch yet)
- Client-side mutation handlers (already call real API routes)
- Email confirmation flow
- Wishlist delete (no API route exists)
- Pagination of wishes or contributions
