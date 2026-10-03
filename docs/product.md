# Product

## What Kageo is

A social wishlist app. People create wishlists for any context (gifts, travel, projects, reading), share them, and the people they share with act on them: reserve, mark as bought, suggest wishes, chip in money, comment. The wishlist is the unit of value; the loop is **create → share → act → coordinate**.

It is deliberately **not** a gift-registry tool. Avoid wording or UI that locks it into "gifts only".

## Who it's for

- **Organiser/owner** — makes a list, shares it, wants to receive what they want without duplicates. Must be able to: create/edit lists and wishes, set an event date and public/private visibility, invite people, accept or ignore suggestions.
- **Guest** (invited or via public link) — wants to coordinate with others without ruining surprises. Must be able to: see the list, reserve/cancel, mark bought, suggest a wish, contribute to a pot, comment.
- Languages: French (default) and English.

## Key rules (the "why")

- **Surprise is preserved.** Pots and guest comments are hidden from the wishlist owner.
- **Coordination over decoration.** Reserve / purchased / pot / suggestions are what differentiate Kageo from a plain list; invest there before cosmetic features.
- **Two kinds of pot**: a wishlist-level pot (shared kitty) and a per-wish gift pot where the goal is the wish's price; reaching it sets the wish to `funded`.
- **Design is intentional.** Fraunces display font, custom tokens, light/dark. Avoid generic utilitarian UI.

## Current feature set

Shipped and backed by real KV storage unless noted.

| Area | Features |
|---|---|
| Accounts | Email+password and Google sign-in; profile; optional date of birth; password change; data export; public profile `/u/[id]` |
| Wishlists | CRUD, event date, public/private, share link, invite by email, dashboard, history of past lists |
| Wishes | CRUD, name/description/URL/priority, statuses `wanted`/`reserved`/`purchased`/`proposed`/`funded` |
| Coordination | Reserve/cancel, mark/remove purchased, propose a wish, comments (drawer + counter) |
| Money | Wishlist-level pot (add/replace/cancel pledge), per-wish gift pot with funded status |
| Platform | fr/en i18n, light/dark theme, PWA with offline page |

**Scaffolded, not finished:** invite emails (invitee is recorded, no email sent); account confirmation (token issued, no confirm endpoint; email mocked without `RESEND_API_KEY`); cover images (field exists, no upload/storage); `allowComments` flag.

## Privacy and data

Stored in Vercel KV: name, email, bcrypt password hash (empty for Google users), optional birthdate, wishlists, wishes, pledges (amount + user id), comments, invited emails. No payment data is handled — pots only *track* pledges; money moves outside the app. Users can export their data (`/api/user/export`). Retention: data persists until the user deletes it; confirmation tokens expire after 24h. Define account-deletion and invitee-email handling before wide launch (see roadmap).

## Out of scope (for now)

Payments processing, marketplace/price tracking, native apps, social feed.
