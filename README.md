# Kageo

A social wishlist app. Create a wishlist for any occasion, share it, and let the people you invite reserve items, mark them as bought, suggest wishes, chip in to a pot and comment, without spoiling the surprise for the owner. French by default, English available.

Built with Next.js 16 (App Router), React 19, TypeScript, NextAuth, Vercel KV and next-intl, structured with Feature-Sliced Design.

## Run it locally

```bash
npm install
cp .env.example .env.local   # or: vercel env pull .env.local
npm run dev                  # http://localhost:3000
```

The environment variables (NextAuth, Google OAuth, Vercel KV, Resend) are listed in [docs/architecture.md](docs/architecture.md#environment). KV is required even in development: there is no local fallback store, so point `.env.local` at a development database, not production.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build; also type-checks everything |
| `npm start` | Serve the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint (0 errors expected, warnings are known debt) |

Use `npm`, not `pnpm` (a `package-lock.json` is committed).

## Documentation

- [docs/product.md](docs/product.md): what Kageo is, who it is for, the rules that shape it
- [docs/architecture.md](docs/architecture.md): structure, routes, KV key schema, environment
- [docs/roadmap.md](docs/roadmap.md): what is done, next and later
- [docs/runbook.md](docs/runbook.md): deploy, rollback, KV backup/restore, troubleshooting
- [docs/decisions.md](docs/decisions.md): why things are the way they are
- [CHANGELOG.md](CHANGELOG.md)
- [CLAUDE.md](CLAUDE.md): conventions for AI-assisted work in this repo
