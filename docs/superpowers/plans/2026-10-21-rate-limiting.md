# Rate limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect login, register and every write route with KV-backed rate limits that a household on one wifi never notices, and show a calm fr/en message when a limit is hit.

**Architecture:** A fixed-window counter helper (`INCR` + `EXPIRE` on Vercel KV) in `shared/lib`, configured by one rules file. Routes call `limitWrite` right after their session check (account bucket, then a shared per-IP ceiling); register uses a per-IP bucket; login uses a failures-only throttle keyed by email + IP. Routes answer 429 with `Retry-After`; the API wrappers turn a 429 into a toast through the event bus.

**Tech Stack:** Next.js 16 route handlers, `@vercel/kv` (`incr`, `expire`, `ttl`, `get`, `del`), NextAuth v4 Credentials, next-intl, Vitest with `src/test/fakeKv.ts`.

**Spec:** `docs/superpowers/specs/2026-10-21-rate-limiting-design.md`

Work on a branch `feat/rate-limiting`. Prefix shell commands with `rtk` (user's global rule). Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Global Constraints

- Fail open: if KV throws, the request is allowed.
- Plain GETs are never limited. Only the three export GETs are (Tier 3).
- Limiter runs **after** the session check (unauthenticated requests never consume budget) and **before** body parsing/validation.
- Starting numbers (`limit` per `windowSeconds`): loginFailures 10/900 · register 20/3600 · reserve 30/600 · contribute 30/600 · comment 30/600 · invite 30/600 · write 120/600 · ipCeiling 600/600. **suggest is 60/600, not 30** (our call: `POST /api/wish` is also how an owner adds wishes in bulk; revisit with URL import).
- All numbers are multiplied by env `RATE_LIMIT_MULTIPLIER` (positive number, default 1).
- 429 body `{ message: 'Too many requests' }` plus a `Retry-After` header (seconds, integer ≥ 1).
- UI message is static: fr "Trop de tentatives, réessayez dans une minute." · en "Too many tries, please wait a minute." Every user-visible string goes in both `fr.json` and `en.json`.
- KV keys: `ratelimit:{rule}:{subject}` (subject = user id, email+IP, or IP) and `ratelimit:ip:{ip}` for the ceiling. No other keys, no changes to lock logic.
- FSD layering, `@/*` alias, no `next/link`, no mocks layer.
- Existing tests (155 Vitest, Playwright e2e) must keep passing.

## Review Focus

- `X-Forwarded-For: "1.2.3.4, 10.0.0.1"` → client IP is `1.2.3.4`; missing header → `'unknown'` (Task 2 test).
- `" Bob@X.io "` and `"bob@x.io"` share one login counter (Task 3 test).
- A KV that throws never blocks a request or crashes a route (Task 2 test).
- A successful login clears the failure counter; failures from another IP do not block this one (Task 3 test).
- Ten users on one IP doing 20 reservations each are all allowed (Task 2 test).
- Hitting the `reserve` limit does not block `comment` for the same account (Task 4 test).
- Counters expire: after the window the same subject is allowed again (Task 2 test).
- An owner adding 60 wishes in 10 minutes is not blocked, the 61st is (Task 4 test).

---

### Task 1: Counter support in the fake KV

**Files:**
- Modify: `src/test/fakeKv.ts`
- Test: `src/test/fakeKv.test.ts` (create)

**Interfaces:**
- Produces on the fake (and therefore on `e2eKv`): `incr(key: string): Promise<number>`, `expire(key: string, seconds: number): Promise<number>`, `ttl(key: string): Promise<number>` (Redis semantics: seconds remaining, `-1` no expiry, `-2` missing), `counter(key: string): number | undefined` test helper. Expiry is evaluated lazily against `Date.now()` so tests can use `vi.useFakeTimers()`.

- [ ] **Step 1: Write failing tests** in `fakeKv.test.ts`: `incr` returns 1,2,3 on repeated calls; `expire` then advancing fake time past the TTL makes the next `incr` return 1 and `ttl` return `-2` for a missing key; `ttl` returns the remaining seconds (rounded up) after `expire(key, 60)`; counters do not appear in `keys()` (so existing key-set assertions stay valid); `del(key)` removes a counter.
- [ ] **Step 2: Run** `rtk npx vitest run src/test/fakeKv.test.ts` — expect FAIL (`incr is not a function`).
- [ ] **Step 3: Implement** the three ops in `rawOps` over a separate `counters: Map<string, { n: number; expiresAt?: number }>`; extend `del` to delete counters too. Because they live in `rawOps`, the `latency` wrapper and `multi()` pick them up.
- [ ] **Step 4: Run** the new test and `rtk npx vitest run` — expect all PASS.
- [ ] **Step 5: Commit** `test: counters (incr/expire/ttl) in the fake KV`.

---

### Task 2: Rate limit core and config

**Files:**
- Create: `src/shared/config/rateLimits.ts`, `src/shared/lib/rateLimit.ts`
- Test: `src/shared/lib/rateLimit.test.ts` (create)

**Interfaces:**
- Consumes: Task 1 fake ops (`incr`, `expire`, `ttl`).
- Produces in `rateLimits.ts` (no server imports, so client code may import it):
  - `type TRateLimitName = 'loginFailures' | 'register' | 'reserve' | 'contribute' | 'comment' | 'suggest' | 'invite' | 'write' | 'ipCeiling'`
  - `type TWriteLimit = 'reserve' | 'contribute' | 'comment' | 'suggest' | 'invite' | 'write'`
  - `getRule(name: TRateLimitName): { limit: number; windowSeconds: number }` (applies `RATE_LIMIT_MULTIPLIER`, read at call time)
  - `RATE_LIMITED_ERROR = 'RATE_LIMITED'` (the code a throttled login throws)
- Produces in `rateLimit.ts`:
  - `clientIp(forwardedFor: string | null | undefined): string` — first comma-separated entry, trimmed; `'unknown'` if none.
  - `hit(name: TRateLimitName, subject: string): Promise<{ ok: true } | { ok: false; retryAfter: number }>` — key `ratelimit:{name}:{subject}`; `INCR`, `EXPIRE` when the result is 1, blocked when result > `limit`, `retryAfter = max(1, ttl)` (window if ttl < 0); **catches any KV error and returns `{ ok: true }`**.
  - `rateLimitResponse(retryAfter: number): NextResponse` — the 429 described in Global Constraints.
  - `limitWrite(request: Request, userId: string, name: TWriteLimit): Promise<NextResponse | null>` — `hit(name, userId)` then `hit('ipCeiling', clientIp(...))` (key `ratelimit:ip:{ip}`); returns the 429 response on the first block, else `null`.
  - `limitRegister(request: Request): Promise<NextResponse | null>` — `hit('register', ip)`.

- [ ] **Step 1: Write failing tests** (mock `@vercel/kv` with `createFakeKv()` as in `src/app/api/comments.test.ts`; use `vi.useFakeTimers()`): `getRule('reserve')` is `{30, 600}` and doubles with `RATE_LIMIT_MULTIPLIER=2`; invalid multiplier (`'abc'`, `'0'`, `'-3'`) falls back to 1; `clientIp('1.2.3.4, 10.0.0.1')` → `'1.2.3.4'`, `clientIp(null)` → `'unknown'`; `hit` allows exactly `limit` calls then returns `{ ok: false, retryAfter }` with `retryAfter` between 1 and `windowSeconds`; after advancing time past the window the subject is allowed again; with a KV whose `incr` rejects, `hit` returns `{ ok: true }`; `rateLimitResponse(42)` has status 429, header `Retry-After: 42`, body `{ message: 'Too many requests' }`; `limitWrite` returns `null` while allowed and a 429 once the account bucket is exhausted, and a different user on the same IP is unaffected; **ten users × 20 `reserve` calls from one IP all return `null`**; one IP's 601st write (spread across users) returns 429.
- [ ] **Step 2: Run** `rtk npx vitest run src/shared/lib/rateLimit.test.ts` — expect FAIL (module not found).
- [ ] **Step 3: Implement** both files as specified. Rules table lives in `rateLimits.ts` with the Global Constraints numbers.
- [ ] **Step 4: Run** the test file, then `rtk npx vitest run` — expect PASS.
- [ ] **Step 5: Commit** `feat(rate-limit): fixed-window limiter and rules`.

---

### Task 3: Tier 1 — register and login

**Files:**
- Create: `src/shared/lib/loginThrottle.ts`, `src/shared/config/authorizeCredentials.ts`
- Modify: `src/app/api/auth/register/route.ts`, `src/shared/config/authOptions.ts`, `src/widgets/Header/Header.tsx`, `src/shared/i18n/messages/fr.json`, `src/shared/i18n/messages/en.json`
- Test: `src/shared/lib/loginThrottle.test.ts`, `src/shared/config/authorizeCredentials.test.ts`, `src/app/api/auth/register/route.test.ts` (create each)

**Interfaces:**
- Consumes: `getRule`, `clientIp`, `RATE_LIMITED_ERROR`, `limitRegister` (Task 2).
- Produces in `loginThrottle.ts`: `isLoginBlocked(email: string, ip: string): Promise<boolean>` (reads the counter, blocked when ≥ `loginFailures.limit`; fails open), `recordLoginFailure(email: string, ip: string): Promise<void>` (`INCR`, `EXPIRE` on first; swallows errors), `clearLoginFailures(email: string, ip: string): Promise<void>`. Subject = `${email.trim().toLowerCase()}|${ip}`.
- Produces in `authorizeCredentials.ts`: `authorizeCredentials(credentials: Record<'email' | 'password', string> | undefined, forwardedFor: string | null | undefined): Promise<{ id: string; email: string; name: string } | null>` — the body that is in `authorize` today, plus: blocked → `throw new Error(RATE_LIMITED_ERROR)`; unknown user or wrong password → `recordLoginFailure` then `null`; success → `clearLoginFailures`. `authOptions` calls it with `req?.headers?.['x-forwarded-for']` (a string in NextAuth v4).

- [ ] **Step 1: Write failing tests.** `loginThrottle.test.ts`: 10 recorded failures → blocked, 9 → not; `" Bob@X.io "` and `"bob@x.io"` share the counter; another IP is not blocked; `clearLoginFailures` unblocks; time past 900 s unblocks. `authorizeCredentials.test.ts` (fake KV with a bcrypt-hashed user, `bcryptjs` real): correct password returns the user; 10 wrong passwords then the **correct** password rejects with `RATE_LIMITED`; success after 3 failures clears the counter (a further 9 failures still don't block); an unknown email counts as a failure. `register/route.test.ts`: 5 registrations from one IP allowed, the 6th returns 429 with `Retry-After`; a different `x-forwarded-for` is unaffected.
- [ ] **Step 2: Run** the three files — expect FAIL.
- [ ] **Step 3: Implement** `loginThrottle.ts` and `authorizeCredentials.ts`; make `authOptions` delegate to it; call `limitRegister(request)` as the first line of the register `POST`.
- [ ] **Step 4: UI.** In `Header.tsx`: if `result?.error === RATE_LIMITED_ERROR` show the new message instead of `invalidCredentials`; on the register path, a `429` response shows the same message instead of `data.message`. Add the key (e.g. `rateLimited`) to both locale files in the namespace `Header` already uses.
- [ ] **Step 5: Run** the three test files and `rtk npx vitest run` — expect PASS.
- [ ] **Step 6: Commit** `feat(rate-limit): throttle login failures and registration`.

---

### Task 4: Tier 2 routes

**Files:**
- Modify (add the call right after the session check): `src/app/api/wish/reserve/route.ts` and `src/app/api/wish/cancel/route.ts` (`'reserve'`); `src/app/api/wish/contribute/route.ts` and `src/app/api/wishlist/contribute/route.ts`, POST and PATCH (`'contribute'`); `src/app/api/wish/[wishId]/comments/route.ts` and `src/app/api/wishlist/[id]/comments/route.ts`, POST only (`'comment'`); `src/app/api/wish/route.ts` POST (`'suggest'`); `src/app/api/wishlist/share/route.ts` POST (`'invite'`)
- Test: `src/app/api/rateLimitRoutes.test.ts` (create; Task 5 extends it)

**Interfaces:**
- Consumes: `limitWrite(request, session.user.id, name)`. Pattern: `const limited = await limitWrite(request, session.user.id, 'reserve'); if (limited) return limited`. The contribute routes authenticate in a helper that returns `{ error }`; call the limiter right after it succeeds in each handler.
- Produces: the table-driven test harness in `rateLimitRoutes.test.ts` — `cases: { name: string; group: TWriteLimit; call: () => Promise<Response> }[]` (mock `@vercel/kv`, `next-auth`, `@/shared/config/authOptions` as in `comments.test.ts`; `signInAs`). Calls may carry junk bodies: the limiter runs before validation, so a call counts whether it returns 400, 403 or 404.

- [ ] **Step 1: Write failing tests**: for each case, `getRule(group).limit` calls from one user return a non-429 status and the next returns 429 with a `Retry-After` header; a signed-out call returns 401 and consumes no budget; exhausting `reserve` for a user does not block that user's `comment` call; `POST /api/wish` allows 60 calls and blocks the 61st.
- [ ] **Step 2: Run** `rtk npx vitest run src/app/api/rateLimitRoutes.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** the calls in every listed handler.
- [ ] **Step 4: Run** the new file and `rtk npx vitest run` — expect PASS (watch `races.test.ts` and `wishActions.test.ts`; none should reach a limit).
- [ ] **Step 5: Commit** `feat(rate-limit): limit reserve, contribute, comment, suggest and invite`.

---

### Task 5: Tier 3 routes

**Files:**
- Modify (limiter `'write'`, right after the session check): `src/app/api/wishlist/route.ts` POST; `src/app/api/wishlist/[id]/route.ts` PUT and DELETE (the session check is in the inner functions); `src/app/api/wish/[wishId]/route.ts` PUT; `src/app/api/wish/delete/route.ts`, `wish/mark-purchased/route.ts`, `wish/remove-purchased/route.ts`, `wish/pot/route.ts` POST, `wishlist/pot/route.ts` POST; `src/app/api/user/me/route.ts` PATCH and DELETE; `src/app/api/user/password/route.ts`; the exports `user/export/route.ts`, `wish/pot/export/route.ts`, `wishlist/pot/export/route.ts` (GET)
- Modify: tests that call `DELETE()` / `GET()` without a request, because `user/me` DELETE and `user/export` GET gain a `request: NextRequest` parameter (the limiter needs the IP).
- Test: extend `src/app/api/rateLimitRoutes.test.ts`

**Interfaces:**
- Consumes: Task 4's harness and `limitWrite(..., 'write')`.

- [ ] **Step 1: Write failing tests**: add a `'write'` case per listed handler (120 allowed, 121st → 429); two different Tier 3 routes share one pool for a user (60 calls to one + 60 to another allowed, the next on either → 429).
- [ ] **Step 2: Run** the file — expect FAIL.
- [ ] **Step 3: Implement** the calls; add the `request` parameter to the two handlers that lack it and update their existing test callers.
- [ ] **Step 4: Run** `rtk npx vitest run` — expect PASS.
- [ ] **Step 5: Commit** `feat(rate-limit): limit remaining write routes and exports`.

---

### Task 6: 429 in the UI

**Files:**
- Create: `src/shared/api/assertOk.ts`
- Test: `src/shared/api/assertOk.test.ts` (create)
- Modify: `src/shared/eventBus/config/eventTypes.ts` (add `'ui:rateLimited': NoPayload` to `UIEvents`), `src/shared/ui/Toast/Toast.tsx`, all `src/shared/api/**/*.ts` wrappers that do `if (!res.ok) { … throw new Error(\`API error …\`) }`, `fr.json`, `en.json`
- Check: `src/widgets/Header/Header.tsx` and any other direct `fetch` outside `shared/api` (Task 3 already handles Header's register fetch).

**Interfaces:**
- Produces: `assertOk(res: Response): Promise<void>` — returns for `res.ok`; for status 429 emits `eventBus.emit('ui:rateLimited', {})` and throws `Error('API error 429: rate limited')`; otherwise throws `Error(\`API error ${res.status}: ${text}\`)` exactly as the wrappers do today. Wrappers call `await assertOk(res)` in place of their block (keep any wrapper that parses a JSON error message on its own, adding only the 429 emit).

- [ ] **Step 1: Write failing tests** for `assertOk`: ok response resolves; 500 with body `boom` throws `API error 500: boom`; 429 throws `API error 429…` and a listener on `'ui:rateLimited'` is called once.
- [ ] **Step 2: Run** `rtk npx vitest run src/shared/api/assertOk.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `assertOk`, the new event type, and the `Toaster` subscription to `'ui:rateLimited'` that shows a `warning` toast with `t('rateLimited')` (key in the `toast` namespace, both locale files, text in Global Constraints). Callers' own generic error toasts may also show; accepted.
- [ ] **Step 4: Replace** the error block in each wrapper with `await assertOk(res)`; grep `API error` and `fetch(` outside `shared/api` to confirm none are missed.
- [ ] **Step 5: Run** `rtk npx vitest run` and `rtk npm run lint` — expect PASS, 0 errors.
- [ ] **Step 6: Commit** `feat(rate-limit): show a calm message on 429`.

---

### Task 7: E2E, docs and final verification

**Files:**
- Modify: `playwright.config.ts` (add `RATE_LIMIT_MULTIPLIER: '1000'` to the web server `env`), `docs/architecture.md` (the `ratelimit:*` keys, `RATE_LIMIT_MULTIPLIER` env var, the 429 behavior), `docs/roadmap.md` (move Launch item 5 to Done with today's date and renumber), `CHANGELOG.md` (if it has an unreleased section, add a line)

- [ ] **Step 1: Edit** the files above.
- [ ] **Step 2: Run** `rtk npm test`, `rtk npm run lint`, `rtk npm run build` — expect all green (build is the gate).
- [ ] **Step 3: Run** `rtk npm run test:e2e` — expect PASS (the e2e IP is `'unknown'`; the multiplier keeps the ceilings out of the way).
- [ ] **Step 4: Manual check** with the dev server: a login form with 11 wrong passwords shows the rate-limit message; reserve, comment and register still work normally afterwards. Report what you saw.
- [ ] **Step 5: Commit** `docs: rate limiting keys, env var and roadmap`.
