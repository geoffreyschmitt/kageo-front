# Contribute Pot Redesign

**Date:** 2026-04-20
**Status:** Approved

## Overview

Replace the default-always-on contribute pot with a user-initiated, creator-owned pot. Any non-owner can discover the pot feature; creation is gated behind being a logged-in user who was invited by the wishlist owner via email. Only one pot can exist per wishlist. The pot is fully hidden from the wishlist owner (it's a surprise).

---

## Data Model (Vercel KV)

### `wishlist:{id}:invitees` — KV Set
Populated when the owner sends a share email. Each member is an email address string. Used to gate pot creation: a logged-in user's account email must appear here to be allowed to create a pot.

### `wishlist:{id}:pot` — KV Hash
```ts
{
  creatorId: string       // userId of the person who started the pot
  creatorName: string     // display name at time of creation
  createdAt: string       // ISO timestamp
}
```
Created once via `POST /api/wishlist/pot`. If this key does not exist, no pot has been started. `totalContributed` remains on the wishlist record (existing field).

### `wishlist:{id}:contributions` — KV List
Unchanged. Each entry: `{ userId, amount, contributedAt }`.

---

## API Routes

### `POST /api/wishlist/share` *(new)*
Makes the currently mocked share-by-email real.

- **Auth:** owner only
- **Body:** `{ wishlistId, email }`
- **Action:** send invite email (mocked for now) + `kv.sadd("wishlist:{id}:invitees", email)`
- **Response:** `{ ok: true }`

### `POST /api/wishlist/pot` *(new)*
Creates the pot for a wishlist.

- **Auth:** logged-in only
- **Guards (in order):**
  1. Wishlist exists
  2. Requester is not the owner
  3. Requester's email is in `wishlist:{id}:invitees`
  4. `wishlist:{id}:pot` does not already exist
- **Action:** `kv.set("wishlist:{id}:pot", { creatorId, creatorName, createdAt })`
- **Response:** `{ creatorId, creatorName, createdAt }`

### `GET /api/wishlist/pot?wishlistId={id}` *(new)*
Fetches pot state. Response differs by caller:

| Caller | Response |
|--------|----------|
| Owner | `404` — pot is invisible to them |
| No pot exists | `404` |
| Not logged in | `{ creatorName, totalContributed }` |
| Logged-in contributor | `{ creatorName, totalContributed, myContribution }` |
| Pot creator | `{ creatorName, totalContributed, myContribution, contributors: [{ name, amount }] }` |

### `POST /api/wishlist/contribute` *(modified)*
Existing route. Add one guard before processing: `wishlist:{id}:pot` must exist, otherwise return `409 Conflict` ("No pot has been started for this wishlist").

---

## Features (FSD)

### `features/ShareWishlist/` *(modified)*
Replace `mockShareWishlistByEmail` with a real call to `POST /api/wishlist/share`. No UI changes.

### `features/CreatePot/` *(new)*
Handles pot discovery and creation for non-owners. Shown whenever no pot exists and the visitor is not the owner.

**Button:** "Start a pot" — always visible to non-owners when no pot exists.

**On click behaviour:**

| Visitor state | Modal shown |
|---------------|-------------|
| Not logged in | "Log in to start a pot — you'll also need to be invited by the wishlist owner." + Login CTA |
| Logged in, not invited | "You need to be invited by the wishlist owner to start a pot." |
| Logged in + invited | Confirmation modal: "Start a gift pot for [ownerName]?" + Confirm / Cancel |

On confirm: calls `POST /api/wishlist/pot`, then refreshes pot state via the event bus.

**FSD structure:**
```
features/CreatePot/
  index.ts
  model.ts                  # useCreatePotModel hook
  ui/
    CreatePotButton.tsx      # the always-visible button
    CreatePotModal.tsx       # the three-state modal
    CreatePotModal.types.ts
    CreatePotModal.module.css
```

### `features/ContributePot/` *(modified)*
- Add `creatorName` prop to `TContributeModal` and display "Organized by [name]" in the hero section.
- For non-logged-in visitors: replace the amount input + buttons with a read-only banner ("Organized by [name] · [currency][total] pooled") and a "Log in to contribute" CTA.
- `totalContributed` and `userContributed` are now sourced from `GET /api/wishlist/pot` rather than hardcoded page state.

### `features/PotDashboard/` *(new)*
Creator-only. Rendered as a collapsible panel on the wishlist page (not a modal). Shows:
- Total contributed
- List of contributors: name + amount

**FSD structure:**
```
features/PotDashboard/
  index.ts
  model.ts                  # usePotDashboardModel — fetches GET /api/wishlist/pot
  ui/
    PotDashboard.tsx
    PotDashboard.module.css
```

---

## Visibility Summary

| Visitor | What they see |
|---------|--------------|
| Owner | Nothing pot-related |
| Non-logged-in, no pot | "Start a pot" button |
| Non-logged-in, pot exists | Read-only banner (creator name + total) + "Log in to contribute" |
| Logged-in, not invited, no pot | "Start a pot" button (invite-required message on click) |
| Logged-in contributor | Contribute button + their contribution + total |
| Pot creator | PotDashboard (total + contributor list) + contribute button |

---

## Out of Scope

- Real email delivery (invite email remains mocked)
- Owner being notified when a pot is created
- Pot deletion or editing
- Contribution limits or caps
