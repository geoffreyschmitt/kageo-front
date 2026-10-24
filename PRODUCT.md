# Product

<!-- impeccable:product-schema 1 -->

Full product context lives in [`docs/product.md`](docs/product.md); read it before design decisions. Phases are in [`docs/roadmap.md`](docs/roadmap.md). This file is a summary for design tooling; if they disagree, `docs/product.md` wins.

## Platform

web

## Users

Gift organisers in France (French default, English supported) and their circle of family and friends. The organiser makes a list for an occasion (birthday, wedding, birth, Christmas) and shares it. Guests open it on a phone, often without an account, and reserve, chip in, suggest or comment.

The grandma test: a non-technical relative must be able to view a shared list on a phone with no account, no install and no friction. Acting (reserve, comment, contribute) needs a simple account.

## Product Purpose

A gift-first social wishlist that stops duplicate gifts and lets people chip in, without spoiling the surprise. Loop: create, share, act, coordinate. Success for now: the creators' own families use it for one real event, Christmas 2026 (lists created, guests who reserve, pots funded).

## Positioning

Surprise-safe reservation plus group pots in one simple tool. The owner never sees reservations, pots or guest comments. (A hypothesis against competitors; see the landscape in `docs/product.md`.)

## Operating Context

Mostly opened on a phone from a shared link. Lists are tied to dated events. Built by two creators (Kevin and Geoffrey), launching to family first, then opening gradually, freemium later.

## Capabilities and Constraints

- Surprise is sacred: owner views hide reservations, purchases, pots and guest comments.
- Pots only track pledges; no payment handling until a payment decision.
- Guests are never paywalled; lists are unlimited; no ads, no data selling.
- Wording stays generic ("wish", "list") so no occasion is locked in.
- Do not build the event-suite vision (RSVP, tasks, Secret Santa) or features outside the current roadmap phase without asking.

## Brand Commitments

Name Kageo (Kevin + Geoffrey). Logo: outlined gift box with a bow in the site green, ink wordmark. Display font Fraunces (never Cormorant Garamond). Voice: warm, plain, friendly, never corporate.

## Evidence on Hand

No testimonials, customers or usage data yet; do not fabricate any. Competitor notes in `docs/product.md` are unverified.

## Product Principles

1. Simplicity first: judge every flow by the grandma test and the fewest steps for an organiser.
2. Protect the surprise above convenience.
3. Coordination over decoration: invest in reserve, purchased, pots and suggestions before cosmetics.
4. Accounts to act, never to view.
5. Intentional design, not generic utilitarian UI.

## Accessibility & Inclusion

WCAG 2.1 AA target, 44px tap targets, text at least 12px, state never by colour alone, light and dark held to the same bar. Details in `docs/product.md`.
