# Runbook

Operational notes for Kageo. Structure and key schema: [architecture.md](architecture.md). Items marked **(verify)** were not confirmed from the repo; check them in the Vercel / Upstash dashboards and then delete the marker.

## Environments and config

- Hosting: Vercel. The project is linked locally through `.vercel/`; the GitHub origin is `geoffreyschmitt/kageo-front`.
- Required env vars are listed in [architecture.md](architecture.md#environment). Local values live in `.env.local` (never commit it). Pull them with `vercel env pull .env.local` once the Vercel CLI is installed (`npm i -g vercel`).
- **Production checklist (verify):** `NEXTAUTH_URL` is the production origin, `NEXTAUTH_SECRET` is set and differs from local, Google OAuth lists `<origin>/api/auth/callback/google` as an authorised redirect URI, and the Vercel KV integration is attached to the project.
- `.env.local` may point at the **production** KV store. Treat every script in `scripts/` as production-affecting unless you have checked.

## Verify a change before it ships

```bash
npm run build   # type-checks everything; the gate
npm test        # vitest: pot/pledge logic, CSV, account purge
npm run lint    # 0 errors expected; warnings are known debt (import order, a few React 19 rules)
```

There is no end-to-end suite. After a build, exercise the touched flow in a browser (`npm run dev`, or `npm start` for the production build).

## Deploy

- **(verify)** Pushes to `master` deploy to production through Vercel's Git integration; other branches and PRs get preview deployments.
- Manual: `vercel` (preview) or `vercel --prod`.
- Serwist generates the service worker at build time (`public/sw.js`, git-ignored); it is disabled in development.

## Roll back

1. Vercel dashboard → project → Deployments → pick the last good deployment → **Promote to Production** (or `vercel rollback`).
2. A rollback only changes code. It does **not** undo KV writes. If the bad release corrupted data, restore from a backup (below).

## KV backup and restore

KV is the only datastore. `scripts/kv-backup.mjs` dumps every key to JSON and restores it:

```bash
# Backup (writes backups/kv-<timestamp>.json, which is git-ignored)
node --env-file=.env.local scripts/kv-backup.mjs backup

# Restore: overwrites keys present in the dump, leaves other keys alone
node --env-file=.env.local scripts/kv-backup.mjs restore backups/kv-….json

# Restore to exactly the dump: also deletes keys that are not in it
node --env-file=.env.local scripts/kv-backup.mjs restore backups/kv-….json --flush
```

- A dump contains emails, password hashes and pledges. Store it somewhere private; never commit or share it.
- **Back up before** any destructive change: a data migration, `cleanup-orphans.mjs --apply`, or a release that changes how keys are written.
- **(verify)** Check whether the Upstash/Vercel KV plan includes its own point-in-time backups; if it does, note the retention here.
- Restore is not atomic and rewrites keys one by one: put the site in maintenance (or accept brief inconsistency) while it runs.

## Orphaned keys

Deletes now run as single transactions (`shared/lib/kvCascade.ts`), but data written by older releases may contain orphans (wish keys whose wishlist is gone, dangling invite references, …).

```bash
node --env-file=.env.local scripts/cleanup-orphans.mjs           # dry run: lists what it would remove
node --env-file=.env.local scripts/cleanup-orphans.mjs --apply   # removes it (back up first)
```

## Account deletion

`DELETE /api/user/me` runs `purgeUser` (`app/api/user/me/purgeUser.ts`). It removes the user's wishlists and everything under them, their pledges, comments, reservations and purchases on other people's content, pots they organised, invitations they received, and finally the account record. Each step is its own transaction and idempotent, and the account record goes last, so if a run fails midway the user can simply retry. It scans keys, so it is slower on large datasets; that is acceptable at current scale.

## Common problems

| Symptom | Likely cause |
|---|---|
| Login redirects to `localhost` or fails with `redirect_uri_mismatch` | `NEXTAUTH_URL` or the Google OAuth redirect URIs do not match the deployed origin |
| `Unauthorized` on every API call after a deploy | `NEXTAUTH_SECRET` changed; existing JWTs are invalid, users must sign in again |
| 500s on every API route | KV env vars missing, or the KV integration was detached |
| `mv` fails with "Permission denied" on Windows | PhpStorm holds the file; use PowerShell `Move-Item` / `Rename-Item` |
