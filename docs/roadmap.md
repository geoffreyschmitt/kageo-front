# Roadmap

Draft derived from the repo state (2026-10-03). Edit freely — this is a starting point, not a commitment.

Legend: **[B]** blocker for real users · **[P]** production readiness · **[Bug]** known defect · items without a tag are improvements.

## Now — make it launchable

Ordered: do these top to bottom.

1. **[B] Browser QA of the per-wish gift pot.** Merged 2026-08-29 without live QA; checklist is in `docs/superpowers/specs/2026-08-28-gift-pot-per-wish-design.md` (Testing section). Cheap, and catches regressions in the riskiest area (money pledges).
2. **[B] Send invite emails** via Resend from `api/wishlist/share`. Today the invitee is only recorded in `wishlist:{id}:invitees`, with a `console.info`; invited people are never notified.
4. **[B] Account deletion.** Users can export their data (`api/user/export`) but not delete it. Must also clean up their wishlists, wishes, pledges, comments, and invitee entries. Needed before a public launch.
5. **[P] Production environment check.** Confirm `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Google OAuth redirect URIs, and Resend sender-domain verification are set for production (only `.env.local` has been seen).
6. **[P] Verification gate.** Repair lint (`next lint` was removed in Next 16; eslint crashes) and add a minimal test setup, starting with the pledge/pot logic (`reconcileFundedStatus`, `readPotForViewer`).
7. **[P] `docs/runbook.md`.** Deploy, rollback, env vars, and KV backup/restore. KV is the only datastore, so a bad delete currently has no safety net.

## Next — fix known defects and debt

- **[Bug]** Multi-key writes (delete cascades etc.) are not atomic; a mid-way failure can leave orphaned keys. Use pipelines/`multi` where possible and add an orphan-cleanup script.
- Remove dead `lib/mock*.ts` files and `useMock` flags across features.
- CSV export of pledges for pot organisers.
- Rename `middleware.ts` → `proxy.ts` (Next 16 convention).
- Replace the boilerplate `README.md` with a human intro and run instructions; add `CHANGELOG.md` and `docs/decisions.md`.

## Later

- Cover images: upload + storage (e.g. Vercel Blob); the `coverImage` field already exists on `TWishlist`.
- Per-wishlist `allowComments` toggle (flag exists, unused).
- Notifications: reservation, new suggestion, pot funded.
- Privacy page and a written data-retention policy.
- Evaluate moving relational data off KV if query needs outgrow it.
