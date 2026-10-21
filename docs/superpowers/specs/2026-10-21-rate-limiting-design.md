# Rate limiting — design

Roadmap: Launch item 5 (`docs/roadmap.md`). Date: 2026-10-21.

## Intent

Protect every route that writes data or checks credentials against two things: bots (fake reservations, comments and pledges, password guessing, mass account creation) and accidental hammering (double taps, retry loops). Kageo launches to family at Christmas 2026, then opens gradually, so the limits are a safety net, not a product feature. Reservations are hidden from the wishlist owner, so a fake reservation would go unnoticed; this is the first defence (see `docs/product.md`).

## Goals

- Every write route and the credential check are covered by one of three tiers.
- A household of about ten people on one wifi never notices the limits.
- A person who is throttled sees one calm message ("too many tries, please wait a minute"), in fr and en.
- One shared helper, one config file with all numbers, easy to tune.
- No new service: counters live in the existing Vercel KV.

## Non-goals

- Limiting plain GETs. The public list is a server page reading KV directly, and a limit there would only risk blocking a guest.
- Bot challenges such as Cloudflare Turnstile (roadmap, Open phase).
- Account lockout. A failed-login counter slows guessing but never locks the real owner out, because the key includes the IP.
- IP blocklists, or admin tooling to inspect or reset counters.

## Anti-goals

- A legitimate relative being blocked because another relative on the same wifi acted a moment earlier.
- A limiter bug or KV outage taking the app down.

## Mechanism

A helper in `shared/lib` (fixed-window counter): `INCR` a key, set an expiry on first hit, compare with the limit. It returns whether the request is allowed and the seconds until the window resets. Routes call it near the top, after the session check where there is one. It takes a tier and a key.

**Fail open.** If KV errors, the request is allowed (our call).

**Client IP** comes from the forwarded-for header Vercel sets; take the first address. If none is present (local dev), use a constant so limits still work in tests.

## Tiers and starting numbers

All numbers are our starting guesses, in one config file.

**Tier 1 — no account, counted per IP**
- Login: failures, about 10 per 15 minutes per email + IP.
- Register: about 20 per hour per IP (a family on one wifi must not be blocked).
- Password reset: same tier, once roadmap item 4 adds the route.

**Tier 2 — per account, actions bots would abuse (about 30 per 10 minutes)**
- Reserve and cancel: `wish/reserve`, `wish/cancel`.
- Contribute: `wish/contribute` and `wishlist/contribute`, POST and PATCH.
- Comments: POST on `wish/[wishId]/comments` and `wishlist/[id]/comments`.
- Suggesting a wish: `wish` POST.
- Invites: `wishlist/share`. Must be stricter once it sends email (roadmap item 3).

**Tier 3 — per account, loose, against hammering (about 120 per 10 minutes)**
- Creating, editing and deleting wishlists and wishes, `mark-purchased`, `remove-purchased`, the pot routes, `user/me` PATCH and DELETE, `user/password`.
- Exports (`user/export`, pot CSV exports): same tier, with a stricter limit possible because they read a lot.

**Per-IP ceiling** on Tiers 2 and 3: about 600 requests per 10 minutes on write routes. A house never reaches it; a bot farm does.

Counting per account in Tiers 2 and 3 is what keeps a shared wifi from affecting anyone.

## When a limit is hit

- The route returns HTTP 429 with a `Retry-After` header.
- The API wrappers in `shared/api/**` turn a 429 into one fr/en message, added to both `fr.json` and `en.json`.
- Login: NextAuth's `authorize` can only fail, not return a 429. The builder decides how a throttled login is surfaced (for example a distinct error code that the sign-in form maps to the message).

## Constraints

- Follow the repo conventions: FSD layering, `@/*` alias, every user-visible string in both locale files.
- Do not change the existing lock logic (`withLock`) or KV key schema beyond adding rate-limit keys. Document the new keys in `docs/architecture.md`.
- Update `docs/roadmap.md` (move item 5 to Done) in the same change.

## Tests

- Vitest on the helper with `src/test/fakeKv.ts`: allows up to the limit, blocks after, resets after the window, fails open on KV error.
- One route test per tier showing 429 after the limit.
- Do not break the existing 155 Vitest tests or the Playwright e2e specs (the e2e run must not trip the limits).

## Calls made while writing this (not yet confirmed by the owners)

- **Login counts failures only.** Check the counter before verifying the password, increment after a wrong one, reset on success. Key is lowercased + trimmed email + IP. Rotating IPs against one account is accepted for now (Turnstile in Open covers it).
- **Per-IP ceiling** is one shared bucket for all Tier 2 and Tier 3 write routes. Tier 1 routes do not feed it. A write request therefore costs two counter calls (account, IP); this is accepted.
- **Tier 2 counts per route group per account** (reserve/cancel, contribute, comments, suggest, invites each have their own counter), so reserving many gifts never blocks commenting. **Tier 3 is one pool per account.**
- **`wishlist/share` stays in Tier 2** with the same number until roadmap item 3 ships; then it gets its own stricter limit. **Password reset is out of this change**; it adopts Tier 1 when item 4 adds the route.
- **E2E:** the limits are overridable by environment variables, and `playwright.config.ts` sets them high. No test-only branch in route code.
- **Message** is static text (no interpolated seconds); `Retry-After` stays in the header.
- **429 handling in the UI:** the builder finds where the wrappers share an error path and extends it; any `fetch` that bypasses the wrappers is brought into scope.

## Left to the builder

- Exact helper API and file names.
- Whether the config is one object or per-route constants.
- How a throttled login reaches the sign-in form.
- Whether exports get their own stricter limit.
