# Kageo — Project Context

This document describes what Kageo is, where it stands today, and where it is headed. Read this before making product decisions or adding features.

---

## What is Kageo?

Kageo is a general-purpose social wishlist app. Users create wishlists for any context — gifts, travel, projects, reading — and share them with others. The people receiving a shared wishlist can interact with it: reserving items, marking them purchased, suggesting new wishes, or contributing money toward a wish.

The product is deliberately not framed as a gift registry tool. The wishlist is the unit of value, and the social loop around it (share → act → coordinate) is the core experience.

---

## Current State

The project is in active early development. The architecture and UI are substantially built, but the production data layer is not yet wired up.

- **Authentication** — Credentials provider (email + bcrypt password) via NextAuth v4. Session stored as JWT. Users live in Vercel KV.
- **Architecture** — Next.js 16 App Router with Feature-Sliced Design (FSD). All business logic is in `features/`, shared primitives in `shared/`, domain types in `entities/`.
- **Database** — Vercel KV (Redis) is the intended storage. The schema and API routes are designed for it, but the KV instance is not fully set up. Most write operations currently use mock implementations.
- **i18n** — Multi-language support via next-intl with a `[locale]` route segment.
- **PWA** — Service worker scaffolded via Serwist (`src/sw.ts`).
- **Tests** — No test runner is configured.

---

## Feature Inventory

### UI-complete (logic may be mocked)

| Feature | Notes |
|---|---|
| Wishlist CRUD | Create, update, delete, view. Supports event date, public/private toggle, cover image field (UI not built yet). |
| Wish CRUD | Add, edit, delete. Includes name, description (expandable), URL, priority, status. |
| Wish priorities | `low`, `medium`, `high`. High-priority wishes get a dedicated highlighted section. |
| Wish statuses | `wanted`, `reserved`, `purchased`, `proposed` |
| Reserve / cancel reservation | Guests can claim an item; owner sees it as reserved. |
| Mark purchased / remove | Tracks items that have been bought. |
| Propose a wish | Guests can suggest items to the wishlist owner. Owner decides whether to accept. |
| Contribute to a pot | Users can contribute a monetary amount toward a wish (crowdfunding). `TContribution` tracks userId, amount, date. |
| Share wishlist | Modal + shareable URL generation. |
| Dashboard | Logged-in home page. Groups wishlists with contextual summary messages. |
| History page | Lists past/archived wishlists. |
| Profile page | User profile UI. |
| Language switcher | UI to switch locale, rendered in the header. |

### Scaffolded / not yet wired up

| Feature | Status |
|---|---|
| Real KV database operations | All features have real API routes but use mock functions. Needs KV to be set up and mocks replaced. |
| Email notifications | `SendConfirmationEmail` feature exists with a mock. No real email provider connected. |
| Cover images | `coverImage` field exists on `TWishlist`. No upload UI or storage built. |
| Comments on wishlists | `allowComments` flag exists on `TWishlist`. Feature not built. |

---

## Product Direction

These principles should guide future decisions:

**Social loop is the priority.** The core interaction is: create a wishlist → share it → people act on it (reserve, buy, suggest, contribute). Features that serve this loop come before cosmetic improvements.

**Any context, not just gifts.** Avoid language, UI patterns, or features that lock the product into a gift registry mental model. A user should feel equally at home making a wishlist for a camping trip or a book club.

**Real database next.** The most important technical milestone is wiring up Vercel KV end-to-end so the app has real persistence. All mock implementations should be replaced systematically once KV is configured.

**Collaboration depth over breadth.** Pot contributions, wish suggestions, and reservations are what differentiate this from a plain list app. Invest here before adding surface-level features.

**Design is intentional.** The display font is Fraunces (bound to the `--font-cormorant` CSS variable). The visual identity is considered — avoid generic or utilitarian UI patterns that work against the aesthetic.

---

## Tech Stack Summary

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| UI | React 19, CSS Modules, custom design tokens |
| Auth | NextAuth v4 (Credentials + JWT) |
| Database | Vercel KV (Redis) |
| Architecture | Feature-Sliced Design (FSD) |
| i18n | next-intl |
| PWA | Serwist |
| Deployment target | Vercel |
