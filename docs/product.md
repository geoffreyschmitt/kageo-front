# Product

## What Kageo is

A social wishlist app, **gifts first**. A gift organiser makes a list for an occasion (birthday, wedding, birth, Christmas), shares it, and their circle acts on it: reserve, mark as bought, suggest a wish, chip in money, comment. The loop is **create → share → act → coordinate**.

**Pitch:** a wishlist that stops duplicate gifts and lets people chip in, without spoiling the surprise. It must be *damn simple*: a grandma should be able to open a shared link on her phone and see the list.

Wording and UI stay generic ("wish", "list") so the app is never locked to one occasion, but non-gift lists (travel, projects, reading) are supported, not marketed.

## Purpose and ambition

Kageo is a side project by two creators, Kevin and Geoffrey (the name is a fusion of their first names). It starts as a tool for their own families and friends in France, then opens gradually to more people (a few friends already want it). The goal is to grow into a real product with a **freemium** model; there is no revenue goal yet.

**Near-term success test:** the creators' own circle uses it for one real event, Christmas 2026. Measured by lists created, guests who reserve, and pots funded.

**Long-term vision (not a commitment):** one account for event management, like one Google account opens Mail, Calendar and Sheets. The wishlist is the first module; others (guest list/RSVP, tasks, budget, a Secret Santa draw…) may never ship. Architecture should avoid assumptions that block this (see `docs/architecture.md`), but no roadmap items exist for it yet.

## Who it's for

- **Primary persona:** a French- or English-speaking gift organiser and their circle of family and friends.
- **Organiser/owner** — makes a list, shares it, wants to receive what they want without duplicates. Can create/edit lists and wishes, set an event date and public/private visibility, invite people, accept or ignore suggestions.
- **Guest** (invited or via public link) — wants to coordinate with others without ruining surprises. Can view a shared list with **no account**. Reserving, marking bought, suggesting, contributing to a pot and commenting need an account.
- **The grandma test:** read-only viewing of a shared list must work on a phone with no account, no install and no friction. Acting requires a simple sign-up/sign-in.
- Languages: French (default) and English.

## Key rules (the "why")

- **Surprise is preserved.** Pots and guest comments are hidden from the wishlist owner, and so are reservations.
- **Coordination over decoration.** Reserve / purchased / pot / suggestions differentiate Kageo from a plain list; invest there before cosmetic features.
- **Simplicity first.** Every flow is judged by the grandma test and by how few steps an organiser needs.
- **Two kinds of pot**: a wishlist-level pot (shared kitty) and a per-wish gift pot where the goal is the wish's price; reaching it sets the wish to `funded`.
- **Accounts to act.** Anonymous reservation is deliberately off: the owner cannot see reservations, so a fake or bot reservation would make a gift look taken with nobody noticing. Named risk: fake/bot reservations (mitigation: accounts, rate limiting, bot protection).
- **No ads, no data selling.** Permanent trust principle; revenue comes only from subscriptions.
- **Design is intentional.** Fraunces display font, custom tokens, light/dark. Avoid generic utilitarian UI.

## Brand

Name: **Kageo** (Kevin + Geoffrey). Logo: an outlined gift box with a solid bow, in the site green, one colour. Display font Fraunces. Tone: warm, simple, friendly, never corporate.

## Business model (freemium, from the Monetise phase)

**Principles**
- Viewing a shared list is always free and never blocked. Guests may see an upsell proposal, never a paywall.
- A logged-in user can always create, share, reserve and comment (subject to visibility and rights). Lists are **unlimited**.
- Paid features are *comfort* on top of the core loop.

**Candidate paid features** (none decided): automatic birthday/Christmas list creation (the flagship, organiser-side), cover images and themes, reminders and digests by email, guest-list/RSVP tools, print/PDF extras, custom slug, pot creation (undecided), a Secret Santa draw if it ships.

**Always free:** the core loop, unlimited lists, invite emails, essential notifications (reservation, pot funded), pledge tracking and contributing to a pot.

**Payments:** today pots only *track* pledges and money moves outside the app. Two models stay open, with no decision: **A)** a subscription unlocks pots and Kageo takes no cut; **B)** pots are free and Kageo takes a percentage. Either needs a regulated payment provider (e.g. Stripe Connect), Kageo never holds funds itself, and a legal review (EU/France payment-services rules) comes first.

## Current feature set

Shipped and backed by real KV storage unless noted.

| Area | Features |
|---|---|
| Accounts | Email+password and Google sign-in; profile; optional date of birth; password change; data export; account deletion; public profile `/u/[id]` |
| Wishlists | CRUD, event date, public/private, share link, invite by email, dashboard, history of past lists |
| Wishes | CRUD, name/description/URL/priority, statuses `wanted`/`reserved`/`purchased`/`proposed`/`funded` |
| Coordination | Reserve/cancel, mark/remove purchased, propose a wish, comments (drawer + counter) |
| Money | Wishlist-level pot (add/replace/cancel pledge), per-wish gift pot with funded status, CSV export of pledges for organisers |
| Platform | fr/en i18n, light/dark theme, PWA with offline page, install prompt, draft privacy page |

**Scaffolded, not finished:** invite emails (invitee is recorded, no email sent); cover images (field exists, no upload/storage).
**Missing for launch:** forgot-password flow, rate limiting, wishlist export (see `docs/roadmap.md`).

## Landscape (draft, from store listings and vendor pages, unverified)

The basic loop (list, share, reserve to avoid duplicates) is a free commodity. Two angles may still differentiate Kageo: **surprise-safe reservation plus group pots in one tool**, and **simplicity**. "No one does all three" is a hypothesis to verify.

| Player | Notes |
|---|---|
| Amazon wishlist | Default for many; tied to Amazon; no pots |
| Giftful | Free, any store, friends claim items, price alerts (per a rival's comparison), six languages |
| Elfster | Secret Santa exchanges: organiser sets budget/date/exclusions, names drawn and emailed privately; free; wishlists secondary |
| Giftster | Closed family-group model |
| iKadoo (FR) | Free; **guests reserve with no account**; Christmas list |
| Listy (FR) | Free multi-shop wishlist; everyone notified on reservation |
| Listful (FR, iOS) | Owner notified on each reservation (weaker surprise); price-drop tracking |
| Mes idées de cadeaux (FR) | Recipient does not see reservations (close to our rule) |
| Cadeau Parfait, KadoListe, GeeftMe (FR) | Reservation lists for birth/birthday/Christmas |
| Oh My Wish! (FR) | Birthday reminders and a Secret Santa draw |
| Lily Liste (FR) | Reportedly stopped creating new lists and pots; points users to Leetchi and Le Pot Commun |
| Leetchi, Le Pot Commun, Milirose (FR) | Pot services that handle money; fees around 3.5–4% on withdrawal (Milirose advertises none); users complain about fees and support |

## Privacy and data

Stored in Vercel KV: name, email, bcrypt password hash (empty for Google users), optional birthdate, wishlists, wishes, pledges (amount + user id), comments, invited emails. No payment data is handled. Users can export their data (`/api/user/export`). Retention: data persists until the user deletes it. Account deletion removes the user's lists, pledges, comments, reservations and organised pots (see `docs/decisions.md`). Invitee emails are stored until the wishlist or the invited person's account is deleted. A lawyer's review of the privacy page is still to do (see roadmap).

**Privacy note, automatic lists:** auto-creating lists from the stored date of birth needs a privacy review. The date is optional and mostly hidden today, and using it to trigger lists or reminders changes its purpose. It must be explicitly opt-in, with a clear consent line in the signup and profile flow.

## Out of scope

Native apps (PWA only, for now), marketplace or price tracking, social feed, payment handling (until the payment decision), ads, data selling. Amazon-specific product import and affiliate links are *considered, not planned* (see roadmap).
