# Invite Emails and Link Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a short invite email through Resend when an owner invites an address, and let anyone with the link read a private list while acting stays limited to invited emails.

**Architecture:** A server-only mail module (`shared/lib/mail/`) with an injectable transport renders and sends the email. `POST /api/wishlist/share` sends first, then records the invite, under the wishlist lock. `getWishlistAccess` splits reading (always allowed) from acting (today's rule, renamed `canAct`); a 403 for a non-invited actor carries `code: 'NOT_INVITED'`, which the client turns into one friendly toast.

**Tech Stack:** Next.js 16 route handlers, `@vercel/kv` (fake KV in tests), `resend` (already in `package.json`), next-intl (`createTranslator` for the email copy), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-23-invite-emails-design.md`

## Global Constraints

- Subject: `You've been invited to a wishlist on Kageo: {listName}` (fr equivalent). Body: who invited, a recap (list name, owner name, event date, shortened description, number of wishes), one button "Open the wishlist", the plain link, a one-line footer. HTML plus plain-text alternative, inline styles. No wish names. Nothing about reservations, pots or comments. No tracking pixels, no click tracking.
- Link in the email: `{NEXT_PUBLIC_APP_URL}/{locale}/wishlist/{id}`, locale-prefixed.
- Language of the email: the owner's current UI locale, sent by the client; invalid or missing falls back to `fr`.
- Send first, then record the invitee. If sending fails nothing is saved.
- Owner-visible errors, in fr and en: address rejected / service unavailable (with "copy the link instead") / rate limit (existing calm message). Already-invited: success with a note, no second email.
- Limits: existing per-owner `invite` stays 30 per 600 s. New per-recipient cap: **10 invite emails per address per 24 h (86400 s) across all owners**, keyed by the lower-cased trimmed address.
- No `RESEND_API_KEY`: development and e2e use a console transport (logs, sends nothing); production returns the "service unavailable" error. Tests inject a fake transport.
- Reading (page and `GET /api/wishlist/{id}`) needs no account for both Private and Public lists. Acting (reserve, mark purchased, comment, suggest, pledge, start a pot) keeps today's rule: owner, anyone signed in on a public list, only an invited email on a private list. Starting a pot stays invite-only.
- Owner never sees reservations, pots or guest comments; existing surprise tests keep passing.
- Every user-visible string in both `fr.json` and `en.json`. No new dependencies.
- `npm run build` is the type-check gate; lint must stay at 0 errors.

## Review Focus

- Names containing `<script>`, `&`, quotes or CR/LF (list name, owner name, description) must be HTML-escaped in the body and stripped of line breaks in the subject (header injection). Pinned in Task 3.
- Address with capitals or surrounding spaces ("  Friend@X.io ") is the same address for the already-invited check and for the per-recipient cap; otherwise the cap is bypassed by changing case. Pinned in Task 4.
- Owner double-clicks Send (two parallel requests, same address): exactly one email. Pinned in Task 4.
- Resend answers with an error object, not an exception: `validation_error` means "rejected", every other error or a thrown network failure means "unavailable". Pinned in Task 3.
- A signed-in stranger opening a private list sees the list and one calm notice, not an error box in the comments area. Pinned in Task 2.

---

### Task 1: Server access — reading is open, acting keeps the invite rule

**Files:**
- Modify: `src/shared/lib/wishlistAccess.ts`
- Modify (rename `canView` to `canAct` and use `notInvitedResponse()`): `src/app/api/wish/contribute/route.ts`, `src/app/api/wish/mark-purchased/route.ts`, `src/app/api/wish/reserve/route.ts`, `src/app/api/wish/route.ts`, `src/app/api/wish/[wishId]/comments/route.ts`, `src/app/api/wishlist/contribute/route.ts`, `src/app/api/wishlist/[id]/comments/route.ts`, `src/app/api/wishlist/[id]/safe-bets/[entryId]/comments/route.ts`
- Modify: `src/app/api/wishlist/[id]/route.ts` (GET: drop the 403 for private lists), `src/app/[locale]/wishlist/[id]/page.tsx` (drop the redirect)
- Test: `src/app/api/wish/wishAccess.test.ts`, `src/app/[locale]/pages.test.ts`, `src/app/api/wishlist/wishlist.test.ts` (and any test that asserts the old 403/redirect; find them by running the suite)

**Interfaces:**
- Produces: `getWishlistAccess(wishlist, sessionUser) => Promise<{ isOwner: boolean; canView: true; canAct: boolean }>` (`canAct` is the old `canView` value: owner, or public list, or invited email). `notInvitedResponse(): NextResponse` returning status 403 with body `{ message: 'Forbidden', code: 'NOT_INVITED' }`, exported from `wishlistAccess.ts`.
- Consumes: existing `kv`, `NextResponse`.

- [ ] **Step 1: Write failing tests.** In `wishAccess.test.ts` extend the private-list cases: a stranger's `reserve`, `markPurchased` and `contributeToWish` still return 403 and `await bodyOf(res)` equals `{ message: 'Forbidden', code: 'NOT_INVITED' }`; the invited account still gets 200. In `wishlist.test.ts` add: `GET /api/wishlist/{id}` on a private list returns 200 for `signInAs(null)` and for a signed-in non-invitee (body includes `wishes`). In `pages.test.ts` replace the "sends strangers away from a private list" expectations: signed-out and `bob` now resolve to props with `userIsOwner: false, isInvited: false` instead of throwing `NEXT_REDIRECT`; `guest` stays `isInvited: true`.
- [ ] **Step 2: Run** `npx vitest run src/app` — expect these new assertions to FAIL (and nothing else).
- [ ] **Step 3: Implement.** In `wishlistAccess.ts` return `canView: true` always and `canAct` per the interface; add `notInvitedResponse`. In each action route replace the `canView` check with `canAct` and return `notInvitedResponse()` instead of the bare 403 (comments GET routes included: a stranger cannot read comments of a private list). In `[id]/route.ts` GET remove the private-list block. In `page.tsx` remove the `redirect('/')` line and the now-unused import if nothing else uses it.
- [ ] **Step 4: Run** `npm test` — expect all PASS. Fix any old test that asserted the removed behaviour by updating it to the new rule (not by weakening unrelated assertions).
- [ ] **Step 5: Commit** `feat(access): anyone with the link can read a private list; acting keeps the invite rule`.

### Task 2: Client — one calm "ask to be invited" notice

**Files:**
- Modify: `src/shared/api/assertOk.ts`, `src/shared/eventBus/config/eventTypes.ts`, `src/shared/ui/Toast/Toast.tsx`, `src/features/Comments/**` (whichever file renders the load error), `src/shared/i18n/messages/{fr,en}.json`
- Test: `e2e/private-link.spec.ts` (create)

**Interfaces:**
- Produces: event `'ui:notInvited': NoPayload`; `class NotInvitedError extends Error` exported from `assertOk.ts`; `assertOk` on a 403 whose JSON body has `code === 'NOT_INVITED'` emits `ui:notInvited` and throws `NotInvitedError`. Toast shows `toast.notInvited` (uses the signed-in email via `useSession`).
- Copy (`toast.notInvited`): en `This list is private. Ask its owner to invite {email} to take part.`; fr `Cette liste est privée. Demandez à son propriétaire d'inviter {email} pour participer.` With no email available use `toast.notInvitedNoEmail`: en `This list is private. Ask its owner to invite you to take part.`; fr `Cette liste est privée. Demandez à son propriétaire de vous inviter pour participer.`
- Comments area for a non-invited signed-in viewer shows the same short notice (key `comments.notInvited`, same wording as `toast.notInvitedNoEmail`) instead of the error state.

- [ ] **Step 1: Write the failing e2e** `private-link.spec.ts` (English routes), three tests: (a) `signed-out visitor reads a private list from the link and is asked to log in on Reserve` — owner creates a private list via `createWishlist(request, name, false)` plus a wish; a fresh context opens `/en/wishlist/{id}`, heading visible, clicking Reserve shows the login prompt; (b) `signed-in stranger sees the list, then a notice when acting` — `newPerson` opens the list, clicks Reserve, expects text matching `/This list is private/` and expects no element with the comments error text; (c) `an invited account can reserve` — owner invites the person's email via `POST /api/wishlist/share` (fake transport is the console one in e2e), person reserves and sees `Reserved by you`.
- [ ] **Step 2: Run** `rm -rf .next-e2e && npx playwright test e2e/private-link.spec.ts` — expect (b) FAIL (generic error), (a) and (c) pass after Task 1.
- [ ] **Step 3: Implement** the interfaces above; add `toast.notInvited*` and `comments.notInvited` to both locale files.
- [ ] **Step 4: Run** the same command; expect 3 PASS. Then `npm run lint`.
- [ ] **Step 5: Commit** `feat(ui): explain why a stranger cannot act on a private list`.

### Task 3: Mail module — transport, errors, invite email rendering

**Files:**
- Create: `src/shared/lib/mail/transport.ts`, `src/shared/lib/mail/inviteEmail.ts`, `src/shared/lib/mail/index.ts`
- Create tests: `src/shared/lib/mail/transport.test.ts`, `src/shared/lib/mail/inviteEmail.test.ts`
- Modify: `src/shared/i18n/messages/{fr,en}.json` (new `email` namespace)

**Interfaces:**
- Produces (`transport.ts`): `type TMail = { to: string; subject: string; html: string; text: string }`; `type TMailTransport = { send: (mail: TMail) => Promise<void> }`; `class MailRejectedError extends Error`; `class MailUnavailableError extends Error`; `getMailTransport(): TMailTransport` (Resend when `RESEND_API_KEY` is set using `RESEND_FROM_EMAIL` as the sender; else console transport when `NODE_ENV !== 'production'`; else a transport whose `send` always throws `MailUnavailableError`); `setMailTransportForTests(transport: TMailTransport | null): void`. The Resend transport maps a result `{ error }` with `error.name === 'validation_error'` to `MailRejectedError`, any other `error` or thrown exception to `MailUnavailableError`.
- Produces (`inviteEmail.ts`): `type TInviteEmailInput = { locale: 'fr' | 'en'; to: string; listName: string; ownerName: string; eventDate: string; description?: string; wishCount: number; url: string }`; `renderInviteEmail(input: TInviteEmailInput): TMail`. Copy comes from the `email` namespace via `createTranslator({ locale, messages, namespace: 'email' })` importing the message JSON. Dates formatted with `Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' })`. Description cut to 160 characters with an ellipsis.
- `email` namespace keys (both locales): `subject` (`You've been invited to a wishlist on Kageo: {listName}` / `Vous êtes invité·e à une wishlist sur Kageo : {listName}`), `heading` (`{ownerName} invited you to a wishlist` / `{ownerName} vous invite à une wishlist`), `event` (`Event: {date}` / `Événement : {date}`), `wishCount` (plural, `# wish`/`# wishes`, `# souhait`/`# souhaits`), `button` (`Open the wishlist` / `Ouvrir la wishlist`), `linkFallback` (`Or copy this link:` / `Ou copiez ce lien :`), `footer` (`You received this email because {ownerName} invited {email} on Kageo. If you don't know them, you can ignore it.` / `Vous recevez cet e-mail car {ownerName} a invité {email} sur Kageo. Si vous ne le connaissez pas, ignorez-le.`).

- [ ] **Step 1: Write failing tests.** `inviteEmail.test.ts`: `renders subject, recap and link in English` (subject equals the English subject with the list name; html contains the link as an `href` and the owner name; text contains the link; html does not match `/reserv|pot|comment/i`); `renders French`; `escapes HTML in names and description` (list name `<script>alert(1)</script> & "x"` appears escaped, never raw `<script>`); `strips line breaks from the subject` (list name `A\r\nBcc: x@y.z` gives a subject with no `\r` or `\n`); `shortens a long description`. `transport.test.ts`: `maps a Resend validation_error to MailRejectedError`, `maps another Resend error to MailUnavailableError`, `maps a thrown network error to MailUnavailableError` (inject a fake Resend client via an exported factory parameter or `vi.mock('resend')`), `uses the console transport without a key outside production and sends nothing`, `refuses to send in production without a key` (throws `MailUnavailableError`), `setMailTransportForTests overrides everything`.
- [ ] **Step 2: Run** `npx vitest run src/shared/lib/mail` — expect FAIL (module missing).
- [ ] **Step 3: Implement** the interfaces. `index.ts` re-exports the public names. Escape with a small local `escapeHtml`. The button is an `<a>` styled inline; the plain link follows it.
- [ ] **Step 4: Run** `npx vitest run src/shared/lib/mail` — expect PASS; then `npm run lint`.
- [ ] **Step 5: Commit** `feat(mail): invite email rendering and a Resend transport with a console fallback`.

### Task 4: Share route — send, then record

**Files:**
- Modify: `src/app/api/wishlist/share/route.ts`, `src/shared/config/rateLimits.ts` (add `'inviteRecipient'` to `TRateLimitName` and a rule `{ limit: 10, windowSeconds: 86400 }`; it is not a `TWriteLimit`)
- Test: `src/app/api/wishlist/wishlist.test.ts` (the `POST /api/wishlist/share` block), `src/app/api/rateLimitRoutes.test.ts` (keep green)

**Interfaces:**
- Consumes: `renderInviteEmail`, `getMailTransport`, `MailRejectedError`, `MailUnavailableError`, `setMailTransportForTests` (Task 3); `hit` from `src/shared/lib/rateLimit.ts`; `withLock`, `wishlistLock`, `LockTimeoutError`, `busyResponse` from `kvLock.ts`.
- Produces: request body `{ wishlistId: string; email: string; locale?: 'fr' | 'en' }`. Responses: `200 { ok: true, alreadyInvited: boolean }`; `422 { code: 'EMAIL_REJECTED' }`; `503 { code: 'EMAIL_UNAVAILABLE' }`; `429` via `rateLimitResponse` when the per-recipient cap is hit; existing 400/403/404 unchanged.

Flow, inside `withLock(wishlistLock(wishlistId), …)`: validate, normalise the address (`trim().toLowerCase()`), owner check, if already in `wishlist:{id}:invitees` return `{ ok: true, alreadyInvited: true }` with no send; else `hit('inviteRecipient', address)`; render with the owner's session name, `wishlist.name`, `eventDate`, `description`, `kv.scard('wishlist:{id}:wishes')` and the URL built from `NEXT_PUBLIC_APP_URL` (fallback `http://localhost:3000`); `await transport.send(mail)`; only then run the existing `kv.multi().sadd(...).sadd(...).exec()`. Map the two error classes to the statuses above.

- [ ] **Step 1: Write failing tests** (inject a fake transport that records mails; reuse the existing describe's fake KV): `sends one email with the right subject and link, then records the invitee`; `normalises the address (" Friend@X.io ") for the invitee and the recipient`; `already invited: ok with alreadyInvited true and no second email`; `rejected address saves nothing and returns 422 EMAIL_REJECTED`; `service down saves nothing and returns 503 EMAIL_UNAVAILABLE`; `stops after 10 emails to one address in 24 h across two owners (11th returns 429)` using different lists and owners; `two parallel invites of the same address send exactly one email`; `locale missing or invalid falls back to fr`; `the email never contains reservation or pot data` (seed a reserved wish and a pot, assert html/text do not mention them); keep the existing owner-only and validation tests.
- [ ] **Step 2: Run** `npx vitest run src/app/api/wishlist src/app/api/rateLimitRoutes.test.ts` — expect the new tests FAIL.
- [ ] **Step 3: Implement** the flow above. Keep the log line but drop the full address from it (log the list id only).
- [ ] **Step 4: Run** `npm test` — expect all PASS; `npm run lint`.
- [ ] **Step 5: Commit** `feat(share): email the invite through Resend, then record it`.

### Task 5: Share dialog — locale, adapted errors, translated strings

**Files:**
- Modify: `src/shared/api/wishlist/shareWishlist.ts`, `src/features/ShareWishlist/model.ts`, `src/features/ShareWishlist/ui/ShareWishlistModal.tsx` and `.types.ts` if the callback shape changes, `src/views/wishlist/wishlist.tsx` (the `shareWishlist(id, email)` call near line 302), `src/shared/i18n/messages/{fr,en}.json` (`shareWishlistModal` namespace)
- Test: `e2e/private-link.spec.ts` (add), `e2e/flows.spec.ts` if an existing share flow asserts the old text

**Interfaces:**
- Produces: `shareWishlist(wishlistId: string, email: string, locale: string): Promise<{ alreadyInvited: boolean }>`; `class ShareWishlistError extends Error { code: 'EMAIL_REJECTED' | 'EMAIL_UNAVAILABLE' }`. The wrapper reads the JSON `code` of a 422/503 and throws `ShareWishlistError`; other failures go through `assertOk` as before (429 keeps its toast).
- Modal strings in both locales (replace the hardcoded English in `model.ts`): `emailRequired`, `emailInvalid`, `errorRejected` (en `This address doesn't look right. Check it and try again.`), `errorUnavailable` (en `We couldn't send the email right now. Try again in a moment, or copy the link and send it yourself.`), `errorGeneric`, `alreadyInvited` (en `This person is already invited.`), `emailSent` (existing). Update `linkNote` to: en `Anyone with this link can see this wishlist. To take part, a person must be invited with the email they sign in with.`; fr `Toute personne avec ce lien peut voir cette wishlist. Pour y participer, il faut avoir été invité·e avec l'adresse e-mail utilisée pour se connecter.` The model uses `useTranslations('shareWishlistModal')`; the locale comes from `useLocale()` at the call site.

- [ ] **Step 1: Write the failing e2e** in `private-link.spec.ts`: `owner invites an address and sees the success message` (opens Share, types an address, expects the `emailSent` text); `inviting the same address again says it is already invited`; `a malformed address shows the translated validation message in French` (open `/fr/...`, expect the French `emailInvalid`).
- [ ] **Step 2: Run** `rm -rf .next-e2e && npx playwright test e2e/private-link.spec.ts` — expect the three to FAIL.
- [ ] **Step 3: Implement** the interfaces; map `ShareWishlistError.code` to `errorRejected`/`errorUnavailable`, anything else to `errorGeneric`; show `alreadyInvited` when the response says so.
- [ ] **Step 4: Run** the e2e file and `npm run lint`; expect PASS.
- [ ] **Step 5: Commit** `feat(share): translated, case-specific invite messages and the owner's language`.

### Task 6: Copy, docs, env and the full gate

**Files:**
- Modify: `src/shared/i18n/messages/{fr,en}.json` (`privateDesc`: en `Only people with the link or an invitation can see this wishlist. It is not shown on your profile.`; fr `Seules les personnes avec le lien ou une invitation peuvent voir cette wishlist. Elle n'apparaît pas sur votre profil.`; the privacy-page sentence about private lists near `"A private wishlist is visible only to you and the people you invite."` to say: visible to the people you invite and anyone who has the link, not shown on your profile — both languages), `.env.example` (replace "Reserved for invite emails (not used yet)" with a live comment and an example `RESEND_FROM_EMAIL="Kageo <invites@your-domain>"`), `docs/architecture.md` (Resend now used; access rules; the new rate rule), `docs/runbook.md` (sender-domain steps: verify domain in Resend, set both vars on Vercel Preview and Production and in `.env.local`), `docs/roadmap.md` (move item 3 to Done with the shipped scope, and a note under item 5 to confirm the Resend domain), the spec (change the friendly message to the wording in Task 2).

- [ ] **Step 1: Apply the copy and doc changes** above.
- [ ] **Step 2: Run the full gate**: `npm test`, `npm run lint`, `rm -rf .next-e2e && npx playwright test`, `npm run build`. Expect all green (e2e count = previous 35 plus the new specs).
- [ ] **Step 3: Manual check once the Resend domain exists** (not blocking the merge): send a real invite to your own address, open it on a phone (light and dark), tap the link signed out.
- [ ] **Step 4: Commit** `docs: invite emails shipped; private lists open by link`.
