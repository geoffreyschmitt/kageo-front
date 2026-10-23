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
| `user/me`, `user/password`, `user/stats`, `user/export` | Account info (incl. optional birthdate), `DELETE` = full account purge, password change, dashboard stats, data export (profile, owned lists with owner-masked wishes, safe bets, and `activity`: the user's own pledges, comments, reservations and purchases elsewhere) |
| `wishlist` , `wishlist/[id]` | Wishlist CRUD |
| `wishlist/share` | Invite by email: sends the invite through Resend, then adds the invitee (nothing is saved if the email fails) |
| `wishlist/pot`, `wishlist/contribute` | Wishlist-level pot; `PATCH` replaces the caller's pledge, `amount: 0` cancels |
| `wishlist/pot/export`, `wish/pot/export` | Pledges as CSV; pot organiser only |
| `wishlist/[id]/comments`, `wish/[wishId]/comments` | Comments |
| `wish`, `wish/[wishId]` | Wish create / read / update |
| `wish/reserve`, `cancel`, `mark-purchased`, `remove-purchased`, `delete` | Wish state transitions |
| `wish/pot`, `wish/contribute` | Per-wish gift pot |
| `safe-bets`, `safe-bets/[entryId]`, `safe-bets/reorder` | Owner's safe-bet gifts: `GET` list, `POST` create, `PATCH`/`DELETE` one entry, `PUT reorder` (`{ids}` must be a permutation of the current entries). Owner only, writes use the `write` rate rule |
| `wishlist/[id]/safe-bets/[entryId]/comments` | Guest thread on a safe bet (`GET`/`POST`); never reaches the wishlist owner (403), rate rule `comment` |
| `wish/import` | `POST {url}`: fetches a public page and returns prefill fields for the wish form (see Wish import) |

Every handler resolves the caller with `getServerSession(authOptions)` (`shared/config/authOptions.ts`).

## Auth

NextAuth v4, JWT sessions (no session store). Providers: Credentials (email + bcrypt) and Google. Google sign-in auto-creates a KV user on first login. `token.id` carries the user id into the session.

Access to a wishlist is decided by `shared/lib/wishlistAccess.ts`. **Reading** needs nothing: anyone with the link, signed in or not, can read a private or a public list (`canView` is always true). **Acting** (reserve, mark purchased, comment, suggest, pledge, start a pot) is `canAct`: the owner, anyone signed in on a public list, or an email in `wishlist:{id}:invitees` on a private one. A refused actor gets `403 { code: 'NOT_INVITED' }`; the client turns it into one toast (`ui:notInvited`, from `assertOk`) or, for the comments area, an inline notice. Private lists are not shown on the owner's public profile (`/u/{id}`). The owner is resolved separately from the access flags so guest-only surfaces (comments, pots) can exclude the owner.

## Data model (Vercel KV)

All values are JSON unless noted. IDs are UUIDs.

| Key | Type | Content |
|---|---|---|
| `user:{email}` | value | `{id, email, name, password(hash), provider, createdAt, termsAcceptedAt?, isPublic?, birthdate?}` (email lowercased) |
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
| `user:{id}:safeBets` | value | `TSafeBet[]` in display order: `{id, title (max 80), description? (max 500), imageUrl? (http/https, max 2048), createdAt}`; at most 30 entries (409 beyond). Shown to guests on every wishlist the user owns |
| `safebet:{entryId}:comments` | list | `TComment` (guest thread, hidden from the owner) |
| `lock:{key}` | value | short-lived (10 s TTL) mutex held by `withLock` (`shared/lib/kvLock.ts`) around any read-modify-write of a record; `lock:wish:{id}`, `lock:wishlist:{id}` or `lock:user:{id}:safebets` (every safe-bet write). Excluded from backups (as are `ratelimit:*` counters) |
| `ratelimit:{rule}:{subject}` | counter (TTL) | fixed-window rate-limit counter (`shared/lib/rateLimit.ts`); `{rule}` is `register`, `passwordResetIp`, `passwordResetEmail` (the mailbox), `passwordResetAttempt`, `reserve`, `contribute`, `comment`, `suggest`, `invite`, `inviteRecipient`, `import` or `write`; `{subject}` is the user id (register: the client IP; inviteRecipient: the invited address, lower-cased) |
| `pwreset:{sha256(token)}` | value (TTL 1 h) | email a password-reset link was issued to. Only the hash of the token is stored; the token exists only in the email. Deleted when used and by the account purge; excluded from backups |
| `pwreset:user:{email}` | value (TTL 1 h) | hash of the account's one live reset token (a new request deletes the previous token) |
| `ratelimit:ip:{ip}` | counter (TTL) | per-IP ceiling across all accounts on write routes |
| `ratelimit:loginFailures:{email}\|{ip}` | counter (TTL) | failed password sign-ins per email and IP (`shared/lib/loginThrottle.ts`); cleared on success |

Wish status: `wanted` · `reserved` · `purchased` · `proposed` · `funded`. `funded` is set by `reconcileFundedStatus` on every contribution write; the organiser may override to `purchased`. Priority: `low` · `medium` · `high`.

Deleting a wishlist, wish or account must also delete every sub-key and back-reference. This is centralised in `shared/lib/kvCascade.ts` (`wishKeys`, `wishlistKeys`, `queueWishlistDeletion`) and runs inside `kv.multi()` transactions; account deletion is `app/api/user/me/purgeUser.ts`. When you add a key under `wish:{id}` or `wishlist:{id}`, add it to those lists. Safe bets follow the same rule: `safeBetKeys` covers an entry's thread (deleted with the entry); the purge removes `user:{id}:safeBets` and every owned thread, and also strips the user's comments from other people's safe-bet threads. The data export includes `safeBets`.

**Visibility rules**: pots, comments and safe-bet threads never reach the wishlist owner (surprise). Role-shaped pot payloads are built in one place, `app/api/wishlist/pot/readPot.ts`. The safe-bet list itself is visible to everyone who can view a wishlist; only its comment threads are guest-only, and the thread routes refuse the owner and require the entry to belong to the wishlist owner. A safe-bet thread belongs to the entry, not to a wishlist, so anyone who can view any of the owner's wishlists can read it.

**Rate limiting**: rules (limit per window) live in `shared/config/rateLimits.ts`: login failures 10 / 15 min, register 20 / hour per IP, reserve, contribute, comment and invite 30 / 10 min, import 20 / 10 min, invite emails per recipient address 10 / 24 h across all owners, suggest 60 / 10 min, other writes (including safe-bet edits) 120 / 10 min per account, and a 600 / 10 min per-IP ceiling. Counters are fixed windows (`INCR`, then `EXPIRE` on the first hit). A refused API request answers `429` with `{message}` and a `Retry-After` header (seconds); the client shows a calm toast via `assertOk`. A blocked sign-in makes `authorize` throw `RATE_LIMITED`, which NextAuth returns as the sign-in `error`. The limiter fails open: if KV errors, the request goes through.

## Wish import

`POST /api/wish/import` with `{url}` returns data to fill the wish form from a product page's Open Graph / schema.org data. It is only called when the person presses **Fill in for me** in the add, propose or edit form; typing or pasting a link never triggers it. Nothing is stored or cached: the page is fetched, read and dropped.

- **Auth and limits:** needs a session (`401` otherwise). Rate group `import`: 20 per 600 s per account plus the per-IP ceiling; every call counts, including failed ones. A missing, non-string or over-2048-character `url`, or one that is not `http:`/`https:`, answers `400`.
- **Response:** always `200 {found, fields, variants?}`. `fields` holds any of `name`, `description`, `imageUrl`, `price` (number), `currency` (symbol, e.g. `€`). `variants` (only when the page lists several product versions) is an array of `{label, name?, description?, imageUrl?, price?, currency?}`. Any failure (refused address, network error, timeout, oversize, not HTML, nothing extractable) is `{found: false, fields: {}}` with no detail, so nothing about the target leaks.
- **Fetch safety** (`shared/lib/fetchHtml.ts`, `shared/lib/netGuard.ts`): `http`/`https` only, ports 80/443 only, no credentials in the URL. Every address the host resolves to must be public (loopback, private, link-local, CGNAT, multicast and other reserved IPv4/IPv6 ranges, `localhost` names refused), and the connection is pinned to the validated address (no second DNS lookup) while TLS is verified against the hostname. At most 3 redirects, each re-checked from scratch. 5 s total timeout, 1 MB body cap (larger is refused, never truncated), `text/html` or `application/xhtml+xml` only, no cookies, no pooled sockets, user agent `Kageo-LinkPreview/1.0`.
- **Extraction** (`shared/lib/extractWishFields.ts`): a linear-time scanner with caps (tags, JSON-LD blocks and size, itemprops, wasted-scan budget, field lengths, price range) so hostile pages cannot burn CPU; JSON-LD `ProductGroup` (else `Product`) wins over Open Graph, then `<meta>`/`<title>`. `node-html-parser` (server-only dependency) is used only to decode HTML entities in extracted text.
- **Product versions** (`variants`): detected from a JSON-LD `ProductGroup` (`hasVariant`) or from a `Product` with several offers that the pasted URL cannot single out (no offer URL matches it, and the priced offers do not all share one price). If one version matches the pasted URL (full URL, or the `variant` parameter), that single version is used like a plain product. `hasVariant` members given as `{"@id"}` references are resolved against the same JSON-LD block / `@graph`. Versions with neither a label nor a price are dropped, then the rest are de-duplicated by (label, price, currency); more than 10 distinct versions count as "too many" and none are returned. A group whose members cannot be told apart (two or more members but fewer than two distinct usable versions, e.g. unresolvable references) is likewise "versions without a usable list": no list, no question. Versions without a price are kept. An `AggregateOffer` `lowPrice` counts as the price only when `highPrice` is absent or equal; a real range has no price. Whenever versions are detected (even too many, or without a usable list), the backup price tags (`product:price:*`, `og:price:*`, `itemprop` price) are ignored, since they usually describe only the default version, so `fields` carries no price in that case. Without versions, a lone price still follows the old rule: the offer matching the pasted URL, else a price shared by all offers, else none.
- **Fill in for me flow** (`entities/wish/model/useLinkImport.ts`, pure rules in `importFlow.ts`, `importHelpers.ts`, `applyImport.ts`): the button is enabled when the link field holds an `http(s)` link and is disabled while a request runs (a second press during loading is ignored). If the field holds share text ("Regarde ça : <link>."), the first link is extracted (linear scan, text capped at 10 000 characters, trailing punctuation and unbalanced `)` stripped, stops at whitespace, quotes and emoji) and replaces the field's text. In Edit with a saved link, pressing first asks "Replace the current info, or only fill the empty fields?" and nothing is fetched until answered; Add and Propose fetch right away and only fill empty fields (a typed name, description, price, currency or image is never overwritten). **Replace** overwrites only the fields the page provides; priority and notes are never touched. Changing the link while a question shows dismisses it with no request; Cancel, Escape or a backdrop click resets the import (question dismissed, in-flight request dropped, nothing applied); a late answer for a link that is no longer in the field is dropped. A `429` shows the rate-limit toast and leaves the form usable; any other failure shows the quiet "couldn't read this site" note.
- **Choosing a version:** when `variants` come back and the form price is empty (or in Replace mode), the person is asked "We found several versions of this product, which one is yours?" and nothing is applied until a version is chosen (buttons read "label · price" with the price formatted for the locale, e.g. "149,99 €" in French; just the price when the label is empty, "Version n" when both are missing). Choosing applies the version over the product-level data: name (version name added after the product name unless it already contains it), description (with the version label as a first line unless the name or description already mentions it), image and, if the version has a price, price and currency. With a typed price (fill-empty mode) there is no question: the version whose price is closest wins only if the gap is at most max(1.00, 1% of the typed price) and it is strictly closer than the next priced version (so typed 149 picks 149.99 among 149.99 and 179.99, while 140 picks nothing); otherwise only the product-level name, description and image fill the empty fields. Typing a price while the version question shows dismisses it and applies the product-level fields to the empty fields.
- **Observed coverage (2026-10-22):** ikea.fr, fnac.com, lego.com, bol.com and thomann.de return `found: false` (bot blocking or JS-rendered pages), while apple.com/fr, nike.com, wikipedia.org and gutenberg.org return fields. Such sites fall back to manual entry by design; this is not a bug.

## Frontend structure

FSD layers in `src/`: `shared → entities → features → widgets → views → app`. Cross-component UI signals go through the typed event bus (`shared/eventBus`). Theme (light/dark) is a cookie read server-side (`shared/theme`) plus an init script to avoid flash. Translations live in `shared/i18n/messages/{fr,en}.json`.

## Integrations

| Service | Use | Notes |
|---|---|---|
| Vercel KV | all persistence | `KV_REST_API_*`, `KV_URL`, `REDIS_URL` |
| Google OAuth | sign-in | `GOOGLE_CLIENT_ID/SECRET` |
| Resend | invite emails (`shared/lib/mail`: renderer plus an injectable transport; a console transport is used when no key is set outside production) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Serwist | PWA / offline | disabled in development; needs the webpack build (`npm run build` uses `--webpack`) |

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `NEXTAUTH_SECRET` | yes | JWT signing |
| `NEXTAUTH_URL` | yes | canonical URL |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, `REDIS_URL` | yes | Vercel KV (provisioned by the integration) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | yes | Google sign-in |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | for invite emails | Resend key and a sender on a verified domain. Without a key, development and e2e log the email and production refuses to send (the owner sees "service unavailable") |
| `NEXT_PUBLIC_APP_URL` | no | used when building share URLs |
| `RATE_LIMIT_MULTIPLIER` | no | scales every rate-limit ceiling (default 1); the e2e config sets 1000 |

Local values come from `.env.local` (created by the Vercel CLI; never commit it). Project is linked via `.vercel/`; origin is `geoffreyschmitt/kageo-front` on GitHub.

## Direction (see `docs/product.md` and `docs/roadmap.md`)

- **Event-suite vision.** A wishlist currently stands alone (`eventDate` is a field on it). If other event modules ever ship, an "event" concept may own wishlists; avoid assumptions that make that hard (e.g. hard-coding one wishlist per occasion), but build nothing for it yet.
- **Needs that will change the stack:** Resend (invite emails, password reset, notifications), Vercel Cron (automatic birthday/Christmas lists, reminders), Vercel Blob (cover images), a regulated payment provider such as Stripe Connect (integrated pots; Kageo never holds funds), and likely relational storage once billing and subscriptions exist. KV is fine up to a few hundred users.
- **Abuse surface:** public-link actions (reserve, comment, contribute) and auth routes are rate limited (see Data model); owner cannot see reservations, so fake/bot reservations would go unnoticed.

## Known architectural debt

- Route, page and logic tests (Vitest, in-memory KV) cover wish and wishlist CRUD, access rules, comments, share, pots, pledges, races, CSV, account routes, the account purge and the server pages; `e2e/` has Playwright flows against the in-memory KV. Lint passes clean.
- Every route that rewrites a wish or wishlist record (edit, delete, reserve, cancel, mark/remove purchased, pledges, gift-pot creation, the account purge's pot and reservation changes) holds `withLock` on that record and re-reads it inside the lock (`SET NX EX`, since `@vercel/kv` is stateless REST and has no `WATCH`). A contended record answers 503. Not locked: comment lists (append-only `rpush`, but the purge rewrites them), wishlist creation/sharing, and cross-record operations such as deleting a wishlist while a pledge lands on one of its wishes. Account purge scans keys (O(keys)). Sessions are stateless JWTs, so a deleted account's cookie still passes `getServerSession` until it expires; routes that only check the session id would then act for a user who no longer exists.
