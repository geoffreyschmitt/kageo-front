# Wish import from a URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pasting a link in the add/propose/edit gift form fills the name, description, image, price and currency from the page, safely and for free.

**Architecture:** A signed-in, rate-limited route (`POST /api/wish/import`) fetches the page through a hardened server-side fetcher (public addresses only, pinned connection, hard limits), extracts Open Graph / schema.org data, and returns plain fields. A hook in `entities/wish` drives the form: it decides when to fetch, applies the fields (fill-empty or replace), and exposes a small state that `WishForm` renders. The three feature models (Add, Propose, Edit) wire it in.

**Tech Stack:** Next.js 16 route handlers (Node runtime), `node:dns` / `node:http(s)`, one small server-only HTML parser, React 19 hooks, next-intl, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-wish-import-from-url-design.md`

Work on a branch `feat/wish-import`. Prefix shell commands with `rtk` (user's global rule), but run Vitest as plain `npx vitest run <file>` (`rtk npx vitest` fails here). Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Global Constraints

- Only `http` and `https`, on ports 80 and 443 only; no credentials in the URL.
- Refuse private, loopback, link-local, multicast and otherwise non-public addresses (IPv4 and IPv6, including `169.254.169.254` and IPv4-mapped IPv6); check the address the connection actually uses (resolve first, then connect to that resolved address; TLS still validated against the original hostname).
- At most 3 redirects, same checks on every hop; total time limit about 5 seconds; stop reading after about 1 MB; accept only HTML responses; no cookies or credentials sent; plain User-Agent identifying Kageo.
- Never return the raw page or error details from the target: only extracted fields or "couldn't read".
- Route runs on the Node.js runtime (not Edge). Any signed-in user may call it.
- Rate limit: new group `import`, 20 per 600 s per account (via `getRule`, scaled by `RATE_LIMIT_MULTIPLIER`), plus the existing per-IP ceiling; every call counts, including failed ones.
- Field limits: name ≤ 200, description ≤ 5000 characters; image must resolve to `http(s)`.
- Price is only returned together with a currency that maps to the form's select (`EUR`→`€`, `USD`→`$`, `GBP`→`£`, `JPY`→`¥`). Unknown or missing currency: omit both price and currency.
- Add/Propose: fill only fields still empty (name/description/imageUrl empty after trim; price ≤ 0 or NaN); currency set only when the price is filled by the import. Priority and notes are never touched.
- Edit: a changed link (saved link non-empty and different) asks first, "Replace" or "Keep my info"; nothing is fetched until answered. Replace overwrites every field the page provides and leaves the rest as it was. No saved link: behaves like Add.
- Triggers: paste, and blur when the value changed and is a valid URL; never per keystroke; the same URL is not fetched twice in a row; latest request wins and emptiness is checked when the response arrives.
- Failure or nothing found: one quiet note ("Couldn't read this site, fill in by hand."), the form works as today. All strings in both `fr.json` and `en.json`.
- Image stays a link (no copying). No Amazon-specific handling, no server-side caching or storage of fetched pages, no KV schema change.
- FSD layering (shared ← entities ← features), `@/*` alias, CSS Modules. Existing tests (277 Vitest, 9 Playwright) must keep passing.

## Review Focus

- A hostname that resolves to a private address, and a redirect to a private address, are refused and return "couldn't read" (Task 2 tests).
- A price like `1 299,90` with no currency tag, JSON-LD inside `@graph`, a relative image URL, and an unmapped currency are handled without wrong data (Task 3 tests).
- A field the person already typed is never overwritten in Add/Propose, and Replace never blanks a field the page didn't provide (Task 5 tests).
- A slow response for an older URL never overwrites the result of a newer paste, and the same URL is not fetched twice (Task 5 policy test, Task 7 e2e).
- A throttled import (429) shows the calm toast and leaves the form fully usable (Task 4 route test, Task 7 e2e).

---

### Task 1: Public-address guard

**Files:**
- Create: `src/shared/lib/netGuard.ts`
- Test: `src/shared/lib/netGuard.test.ts`

**Interfaces:**
- Produces: `isPublicAddress(ip: string): boolean` — true only for a valid, publicly routable IPv4/IPv6 literal; false for anything else, including invalid strings.

- [ ] **Step 1: Write failing tests** (`it.each`): false for `0.0.0.0`, `10.1.2.3`, `100.64.0.1`, `127.0.0.1`, `169.254.169.254`, `172.16.0.1`, `172.31.255.255`, `192.168.1.1`, `192.0.2.1`, `198.18.0.1`, `224.0.0.1`, `255.255.255.255`, `::`, `::1`, `fc00::1`, `fd12::1`, `fe80::1`, `ff02::1`, `2001:db8::1`, `::ffff:127.0.0.1`, `::ffff:10.0.0.1`, `64:ff9b::7f00:1`, `not-an-ip`, `''`; true for `8.8.8.8`, `1.1.1.1`, `93.184.216.34`, `172.32.0.1`, `2606:4700:4700::1111`, `::ffff:8.8.8.8`.
- [ ] **Step 2: Run** `npx vitest run src/shared/lib/netGuard.test.ts` — expect FAIL (module not found).
- [ ] **Step 3: Implement** `isPublicAddress` in `src/shared/lib/netGuard.ts` with `node:net` `isIP`, CIDR range tables for both families, and unwrapping of IPv4-mapped (`::ffff:a.b.c.d`) and NAT64 (`64:ff9b::/96`) addresses before checking the embedded IPv4.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `feat(import): public-address guard`.

---

### Task 2: Hardened HTML fetcher

**Files:**
- Create: `src/shared/lib/fetchHtml.ts`
- Test: `src/shared/lib/fetchHtml.test.ts`

**Interfaces:**
- Consumes: `isPublicAddress` (Task 1).
- Produces:
  - `type TRawResponse = { status: number; headers: Record<string, string | undefined>; body: AsyncIterable<Uint8Array>; destroy: () => void }`
  - `type TFetchHtmlDeps = { resolve: (hostname: string) => Promise<string[]>; request: (target: { url: URL; address: string; signal: AbortSignal }) => Promise<TRawResponse> }`
  - `fetchHtml(rawUrl: string, deps?: Partial<TFetchHtmlDeps>): Promise<{ html: string; finalUrl: string } | null>` — never throws; `null` on any refusal or failure.
  - Defaults: `resolve` = `dns.promises.lookup(host, { all: true })`; `request` = `node:http`/`node:https` request that connects to `address` (custom `lookup` returning the already-validated address; `host`/`servername` stay the hostname so TLS validates against it), sends `User-Agent: Kageo-LinkPreview/1.0`, no cookies.

- [ ] **Step 1: Write failing tests** with fake deps (no real network): returns `{ html, finalUrl }` for a 200 `text/html` page; `null` for each of: `ftp://x.com`, `http://x.com:8080/`, `http://user:pw@x.com/`, `http://localhost/`, `http://127.0.0.1/`, `http://[::1]/`, `http://2130706433/` (WHATWG normalises to `127.0.0.1`), `http://169.254.169.254/latest/meta-data`, a hostname whose `resolve` returns `['10.0.0.5']`, a hostname returning one public and one private address, a redirect (302 `Location`) to a private IP, a redirect chain longer than 3, a non-2xx status, `Content-Type: application/json`, a body over 1 MB (assert `destroy` was called and no more chunks were read), a body stream that never ends (use fake timers; resolves `null` at 5 s). Also: a redirect to a relative `Location` resolves against the current URL and re-runs all checks; `request` receives the validated `address`, never the hostname.
- [ ] **Step 2: Run** `npx vitest run src/shared/lib/fetchHtml.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `fetchHtml` with the constants `MAX_REDIRECTS = 3`, `TIMEOUT_MS = 5000`, `MAX_BYTES = 1_000_000` exported for the tests. One `AbortController` covers the whole call including redirects. Decode the body as UTF-8, honoring a `charset=` parameter in `Content-Type` when `TextDecoder` supports it.
- [ ] **Step 4: Run** the test and `npx vitest run` — expect PASS.
- [ ] **Step 5: Commit** `feat(import): hardened server-side HTML fetcher`.

---

### Task 3: Field extraction

**Files:**
- Create: `src/shared/lib/extractWishFields.ts`
- Test: `src/shared/lib/extractWishFields.test.ts`
- Modify: `package.json` / `package-lock.json` (one small server-only HTML parser, e.g. `node-html-parser`; state the choice in the report)

**Interfaces:**
- Produces:
  - `type TImportedFields = { name?: string; description?: string; imageUrl?: string; price?: number; currency?: string }` (only keys with a value are present)
  - `extractWishFields(html: string, pageUrl: string): TImportedFields`
  - `ISO_TO_SYMBOL: Record<string, string>` = `{ EUR: '€', USD: '$', GBP: '£', JPY: '¥' }`

- [ ] **Step 1: Write failing tests** with inline HTML fixtures: JSON-LD Product only; Open Graph only; both (JSON-LD name wins, `og:description` wins over meta description); neither → `{}`; JSON-LD as an array and inside `@graph`; `offers` as object, as array, and `AggregateOffer.lowPrice`; prices `"129,90"`, `"129.90"`, `"1 299,90"`, `"1,299.90"`, number `129.9`, `"0"` and `"free"` (→ no price); `product:price:amount` + `product:price:currency`; `itemprop="price"` with `itemprop="priceCurrency"`; relative `og:image` resolved against `pageUrl`; `javascript:` image dropped; unmapped currency (`CHF`) → neither price nor currency; price with no currency anywhere → neither; HTML entities decoded and whitespace collapsed; name cut to 200, description to 5000; a page with a malformed JSON-LD block still yields Open Graph fields.
- [ ] **Step 2: Run** `npx vitest run src/shared/lib/extractWishFields.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** per the spec's preference order (Name: JSON-LD Product `name` → `og:title` → `<title>`; Description: `og:description` → meta description → JSON-LD `description`; Image: `og:image` → JSON-LD `image`, string or array or object with `url`; Price/currency: JSON-LD offers → `product:price:*` / `og:price:*` → microdata). Wrap each JSON-LD block in try/catch.
- [ ] **Step 4: Run** the test and `npx vitest run` — expect PASS.
- [ ] **Step 5: Commit** `feat(import): extract wish fields from page metadata`.

---

### Task 4: The import route

**Files:**
- Create: `src/app/api/wish/import/route.ts`
- Modify: `src/shared/config/rateLimits.ts` (add `'import'` to `TRateLimitName` and `TWriteLimit`; rule `{ limit: 20, windowSeconds: 600 }`), `src/app/api/rateLimitRoutes.test.ts` (one new case in the table, group `'import'`)
- Test: `src/app/api/wish/import/route.test.ts`

**Interfaces:**
- Consumes: `fetchHtml` (Task 2), `extractWishFields` / `TImportedFields` (Task 3), `limitWrite(request, userId, 'import')`.
- Produces: `POST /api/wish/import`, body `{ url: string }` → `200 { found: boolean; fields: TImportedFields }`. `401` signed out; `429` throttled (from `limitWrite`); `400 { message }` for a missing/non-string/over-2048-character url or a non-`http(s)` URL. A fetch that fails or yields no fields is `200 { found: false, fields: {} }`, never a 5xx and never target details. `export const runtime = 'nodejs'`.

- [ ] **Step 1: Write failing tests** (mock `@vercel/kv` with the fake, `next-auth`, `@/shared/config/authOptions`, and `@/shared/lib/fetchHtml`; style of `src/app/api/comments.test.ts`): 401 when signed out and no budget consumed; 400 for `{}`, `{url: 5}`, a 3000-character url, `ftp://x.com`; fields returned with `found: true` for a mocked page; `fetchHtml` returning `null` → `200 { found:false, fields:{} }`; `fetchHtml` throwing → still `200 found:false`; `getRule('import').limit` calls allowed and the next returns 429 with `Retry-After`. In `rateLimitRoutes.test.ts` add the `import` case (junk body returns 400 before any fetch).
- [ ] **Step 2: Run** the two test files — expect FAIL.
- [ ] **Step 3: Implement** the route (session check → `limitWrite` → validate → fetch → extract) and the rate rule.
- [ ] **Step 4: Run** `npx vitest run` — expect PASS.
- [ ] **Step 5: Commit** `feat(import): POST /api/wish/import`.

---

### Task 5: Client logic (merge, policy, API wrapper, hook)

**Files:**
- Create: `src/shared/api/wish/importFromUrl.ts`, `src/entities/wish/model/applyImport.ts`, `src/entities/wish/model/linkImportPolicy.ts`, `src/entities/wish/model/useLinkImport.ts`
- Modify: `src/entities/wish/model/index.ts` (exports)
- Test: `src/entities/wish/model/applyImport.test.ts`, `src/entities/wish/model/linkImportPolicy.test.ts` (and `useLinkImport.test.tsx` only if `@testing-library/react` is already installed; do not add it)

**Interfaces:**
- Consumes: `TImportedFields` (Task 3, `import type` only); `assertOk` (existing).
- Produces:
  - `importWishFromUrl(url: string, signal?: AbortSignal): Promise<TImportedFields | null>` in `shared/api/wish/importFromUrl.ts` — POSTs `/api/wish/import`, `await assertOk(res)`, returns the fields when `found`, else `null`.
  - `type TImportableForm = { name: string; description: string; price: number; currency: string; imageUrl: string }`
  - `applyImport(current: TImportableForm, imported: TImportedFields, mode: 'fillEmpty' | 'replace'): Partial<TImportableForm>` — returns only changed fields, per the Global Constraints (fillEmpty: empty means trimmed-empty text or price ≤ 0 / NaN; currency only with a price; replace: every provided field overwrites).
  - `decideLinkAction(input: { isEdit: boolean; savedUrl: string; url: string; lastHandledUrl: string }): 'ignore' | 'fetchFillEmpty' | 'askReplace'` — `ignore` for a non-`http(s)` or invalid url, for `url === lastHandledUrl`, and (edit) for `url === savedUrl`; `askReplace` when `isEdit`, `savedUrl` is non-empty and differs; otherwise `fetchFillEmpty`.
  - `type TLinkImport = { status: 'idle' | 'loading' | 'found' | 'notFound' | 'asking'; onLinkPaste: (pastedUrl: string) => void; onLinkBlur: () => void; onReplace: () => void; onKeep: () => void }`
  - `useLinkImport<T extends TImportableForm & { purchaseUrl: string }>(params: { formData: T; applyPatch: (patch: Partial<TImportableForm>) => void; savedUrl?: string }): TLinkImport` — `savedUrl !== undefined` means Edit mode. Latest request wins (abort the previous), reads the latest `formData` via a ref when the response arrives, remembers the last handled URL, treats an abort as silent, maps a thrown 429 to `idle` (the toast already shows) and any other failure or a `null` result to `notFound`.

- [ ] **Step 1: Write failing tests.** `applyImport`: fillEmpty keeps a typed name, fills an empty description, fills price+currency only when price ≤ 0, leaves currency alone when the price is already set, ignores fields absent from `imported`; replace overwrites name/description/imageUrl/price+currency when provided and leaves others untouched, never blanks a field. `decideLinkAction`: the table above including `lastHandledUrl` dedupe, `javascript:alert(1)`, `ftp://…`, `''`.
- [ ] **Step 2: Run** the two test files — expect FAIL.
- [ ] **Step 3: Implement** the four modules and exports.
- [ ] **Step 4: Run** `npx vitest run`, `npx tsc --noEmit` and `npm run lint` — expect PASS.
- [ ] **Step 5: Commit** `feat(import): client import logic and hook`.

---

### Task 6: WishForm UI and copy

**Files:**
- Modify: `src/entities/wish/ui/WishForm.tsx`, `src/entities/wish/ui/WishForm.types.ts` (add optional `linkImport?: TLinkImport` to both base props), `src/entities/wish/ui/WishForm.module.css`, `src/shared/i18n/messages/fr.json`, `src/shared/i18n/messages/en.json`

**Interfaces:**
- Consumes: `TLinkImport` (Task 5).
- Produces: the purchase-link field is the first field of the form (full width). When `linkImport` is provided, the input calls `linkImport.onLinkPaste(clipboardText.trim())` on paste and `linkImport.onLinkBlur()` on blur. Under it, a `role="status"` `aria-live="polite"` line shows by `linkImport.status`: `loading` → `wishForm.import.looking`, `found` → `wishForm.import.found`, `notFound` → `wishForm.import.notFound`; `asking` shows `wishForm.import.replaceQuestion` with two `type="button"` buttons (`wishForm.import.replace` → `onReplace`, `wishForm.import.keep` → `onKeep`). Copy (fr and en): looking "Looking for the details…" · found "Found it, filled in below. Check and change anything." · notFound "Couldn't read this site, fill in by hand." · replaceQuestion "This link is different. Replace the current info with what the new link gives?" · replace "Replace" · keep "Keep my info". Without `linkImport` the form behaves as today (apart from the field's position).

- [ ] **Step 1: Move** the purchase-link block to the top of the grid and add the optional handlers and status/question UI with CSS Module classes in the repo's BEM style (`wishForm__importNote`, `wishForm__importQuestion`, `wishForm__importActions`); add the i18n keys to both locale files with identical key sets.
- [ ] **Step 2: Run** `npx tsc --noEmit`, `npm run lint`, `npx vitest run` — expect PASS (existing usages still compile because the prop is optional).
- [ ] **Step 3: Commit** `feat(import): link-first wish form with import status`.

---

### Task 7: Wire into Add, Propose and Edit, plus e2e

**Files:**
- Modify: `src/features/AddWish/model.ts`, `src/features/ProposeWish/model.ts`, `src/features/EditWish/model.ts`, and the three modals (`src/features/AddWish/ui/AddWishModal.tsx`, `src/features/ProposeWish/ui/ProposeWishModal.tsx`, `src/features/EditWish/ui/EditWishModal.tsx`)
- Test: `e2e/wish-import.spec.ts` (read the existing specs in `e2e/` first for sign-in and wishlist helpers)

**Interfaces:**
- Consumes: `useLinkImport`, `TLinkImport` (Task 5); `WishForm`'s `linkImport` prop (Task 6).
- Produces: each model calls `useLinkImport({ formData, applyPatch: (patch) => setFormData((prev) => ({ ...prev, ...patch })), savedUrl })` and returns `linkImport` alongside its existing values; `savedUrl` is `initialData.purchaseUrl || ''` in Edit and omitted in Add and Propose. Each modal passes `linkImport` to `WishForm`.

- [ ] **Step 1: Write the failing e2e spec** using `page.route('**/api/wish/import', …)` to fulfil responses (the real route cannot fetch localhost by design): (a) Add: type a name, paste a link, the mocked fields fill description/price/currency/image but the typed name stays; (b) not found (`found:false`) shows the quiet note and the form still submits by hand; (c) Propose as a guest account fills the same way; (d) Edit: changing the link shows the question and no request is made until an answer; Keep leaves fields as they were, Replace overwrites only the provided fields; (e) stale response: first request delayed 1 s, a second link pasted at once, the form ends with the second result; (f) a `429` response shows the rate-limit toast and the form stays usable.
- [ ] **Step 2: Run** `npm run test:e2e -- e2e/wish-import.spec.ts` — expect FAIL.
- [ ] **Step 3: Implement** the wiring in the three models and modals.
- [ ] **Step 4: Run** `npm run test:e2e`, `npx vitest run`, `npm run lint` — expect PASS (all existing specs still green).
- [ ] **Step 5: Commit** `feat(import): paste a link in add, propose and edit forms`.

---

### Task 8: Docs and final verification

**Files:**
- Modify: `docs/roadmap.md` (move Launch item 6 to Done with 2026-10-22, renumber the rest, fix cross-references; update the Amazon note in Open if it still says the generic import is in Launch), `docs/architecture.md` (the route, the `import` rate group and the fetch safety rules), `CHANGELOG.md`

- [ ] **Step 1: Edit** the three docs.
- [ ] **Step 2: Run** `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e` — expect all green; report the real counts.
- [ ] **Step 3: Manual check** against real public product pages: start a dev server with the fake KV on a port other than 3000/3100 (`E2E_FAKE_KV=1` plus the dummy env vars from `playwright.config.ts`), sign in, and POST `/api/wish/import` for two or three real public shop product URLs and for `http://169.254.169.254/` and `http://localhost:3000/`; report which fields came back and confirm the last two return `found:false`. Do not commit scratch scripts. Kill the server afterwards.
- [ ] **Step 4: Commit** `docs: wish import from URL`.
