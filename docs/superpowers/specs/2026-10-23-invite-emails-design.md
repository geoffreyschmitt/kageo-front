# Invite emails and link access to private lists

Roadmap Launch item 3. Status: design, awaiting approval.

## Why

Today "Share by email" only records the address (`wishlist:{id}:invitees`, `email:{addr}:invitedWishlists`); nobody is told. For a family launch the owner needs to send "you're invited" to people who may never have used Kageo, and those people must be able to open the list without friction. A grandma who taps the link must see the list, with no account; only acting (reserve, comment, pledge) asks her to sign in.

Doing this exposed a mismatch: the Share dialog already says "anyone with this link can see your wishlist", but the server sends signed-out people to the home page on a private list. This design fixes both.

## What gets built

### 1. The invite email

Sent when the owner invites an address from the Share dialog (`POST /api/wishlist/share`).

- **Subject:** "You've been invited to a wishlist on Kageo: {list name}" (French equivalent).
- **Body, kept short:** a greeting line saying who invited them ("{owner name} invited you"), a small recap of the list, one button "Open the wishlist", and a plain-text link under it. A one-line footer: why they received it, who sent it.
- **Recap contents:** list name, owner name, event date, description (shortened), number of wishes. *My call:* no wish names in the email. It must never contain anything about reservations, pots or comments (the owner's surprise; also the recap is the owner's own list, so it only holds what the owner already knows).
- **Link:** `{NEXT_PUBLIC_APP_URL}/{locale}/wishlist/{id}`, locale-prefixed. It opens the list directly for anyone, signed in or not.
- **Language:** the language the owner is using in the app (the client sends its locale with the invite). The invitee's language is unknown. *My call.*
- **Format:** HTML plus a plain-text alternative, inline styles, no images required to understand it, readable in dark mode and on a phone. Brand: Kageo logo mark as text or a small hosted image; builder decides.
- **Sender:** `RESEND_FROM_EMAIL` (for example "Kageo <invites@your-domain>"). The domain must be verified in Resend (outside the repo, see Prerequisites).

### 2. Behaviour of the invite

- **Send first, then save.** The invitee is recorded only after the email was accepted by Resend. If sending fails, nothing is saved, so the owner can fix the address and retry, and nobody sits "invited" without ever being told. *My call.*
- **Errors the owner sees, adapted to the case** (fr + en):
  - Address rejected by the email service (malformed or refused): "This address doesn't look right; check it and try again."
  - Email service unavailable or not configured: "We couldn't send the email right now. Try again in a moment, or copy the link and send it yourself."
  - Rate limit hit: the existing calm rate-limit message.
- **Already invited:** if the address is already an invitee, return success with a note ("already invited") and send no second email. Re-sending a reminder is out of scope.
- **Abuse protection:** the existing per-owner `invite` limit stays (30 per 10 minutes). *My call:* add a per-recipient cap (for example 3 invite emails per address per 24 hours, across all owners) so Kageo cannot be used to flood one inbox. Exact numbers are the builder's to tune.
- **No tracking, no marketing:** the email is transactional, sent only because the owner asked for it. No tracking pixels or click tracking.
- **Not a real inbox in dev and e2e:** with no `RESEND_API_KEY`, development and the e2e run use a console transport that logs the email instead of sending; production without a key returns the "service unavailable" error. Tests inject a fake transport.

### 3. Access: anyone with the link can read a list

The meaning of Private and Public becomes:

| | Reachable by link | Listed on the owner's public profile |
|---|---|---|
| Private | yes, anyone | no |
| Public | yes, anyone | yes |

- Opening a list needs no account, and no invitation, for both kinds.
- Acting always needs a signed-in account: reserve, mark purchased, comment, suggest, pledge to a pot. These routes already require a session; they stop requiring an invitation on private lists. *My guess, put to the user in a summary they answered "yes" to, not discussed on its own:* any signed-in person who has the link may act on a private list.
- **Starting a pot stays limited to invited people**, as today ("only the owner's invitees can start a pot"). Builder: keep that check; pledging to an existing pot follows the "any signed-in person" rule above. *My call; the user can overrule.*
- Invites keep their other role: the list appears under "Shared with me" for that email, and an invitee can start a pot.
- **Surprise rules are unchanged.** The owner still never sees reservations, pots or guest comments.
- The link is the secret: list ids are random UUIDs, not guessable. Anyone who has the link can forward it. The owner is told so where they choose Private (one line of copy).

Where this lands in code: the single access helper `shared/lib/wishlistAccess.ts` (view rule), `app/[locale]/wishlist/[id]/page.tsx` (the redirect to `/` for private lists), `app/api/wishlist/[id]/route.ts` (the 403 on GET), and the routes that call `getWishlistAccess` to gate actions. History and "Shared with me" listings are unchanged.

## Non-goals

- Reminders, re-send buttons, delivery status or bounce handling.
- Email for anything but invites (password reset is Launch item 4 and reuses the mail module).
- Inviting by link only, QR codes, SMS, WhatsApp.
- Per-user email preferences or unsubscribe pages (transactional only for now).
- Rich templating tools (React Email, MJML). Plain template functions are enough.
- Changing who can start a pot beyond keeping today's rule.

## Anti-goals (a failure even if it works)

- Any email, error message, or log line that reveals a reservation, pledge, pot or comment to the owner or a stranger.
- Recording an invite that was never delivered, silently.
- A signed-out person landing on the home page when they tap the link.
- Email addresses leaking to other invitees (never CC; one email per recipient, nothing in the page shows other invitees to guests).

## Constraints

- Stack as is: Next.js 16, KV via `@vercel/kv`, `resend` (already in `package.json`), next-intl for fr/en. The mail module lives under `shared/` (lib), is server-only, and has an injectable transport.
- Every user-visible string in both `fr.json` and `en.json`, including the email copy (a separate `email` namespace).
- No new dependencies unless unavoidable.
- Docs in the same change: `docs/roadmap.md` (move item 3 to Done, update item 5's checklist), `docs/architecture.md` (access rules, Resend now used, env), `docs/runbook.md` (sender domain), privacy page text if it describes "private".

## Prerequisites (outside the repo, the user's)

- A Resend account, an API key, and a **verified sending domain** (DNS records: SPF, DKIM). Without a verified domain Resend only delivers to the account owner's own address. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Vercel (Preview and Production; Production KV is a separate open item) and in `.env.local`.
- Until the domain exists, everything is built and tested against the fake transport; real delivery is verified once the domain is ready.

## Testing

- Unit/route tests (existing fake KV): invite sends one email with the right subject, locale, link and recap; no reservation/pot data in it; failure paths (rejected address, service down, no key) save nothing and return the right message; already-invited sends nothing; per-recipient cap; owner-only; rate limit.
- Access tests: a signed-out visitor and a stranger can open a private list's page and `GET /api/wishlist/{id}`; they cannot act signed-out; a signed-in stranger can reserve and comment on a private list; only invitees can start a pot; the owner payload stays masked (existing surprise tests keep passing).
- e2e: private list opened signed-out via link shows the list and asks to log in on Reserve; owner invites an address and sees success (console transport).
- Manual once the domain is verified: send a real invite, check it renders in a phone mail app (light and dark), and the link works signed-out.

## Left to the builder

Visual design of the email (within "simple"), exact copy, the per-recipient cap numbers, how the client passes the locale, naming of the mail module, how the console transport is selected.
