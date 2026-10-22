# Wish import from a URL — design

Roadmap: Launch item 6 (`docs/roadmap.md`). Date: 2026-10-22.

## Intent

Adding a gift should be "paste a link and the rest fills itself in". Today the add form asks for a name, a price (required), a currency, a description, an image link, a priority, a purchase link and notes. Most of that is on the shop's page already. The people using Kageo at launch are family, some of whom are not comfortable with forms (see `docs/product.md`: simple above all), so every field we can fill for them is typing and mistakes avoided.

## Goals

- Pasting a link in the form fills name, description, image link, price and currency, as far as the page provides them.
- Works the same in every form that adds a gift: the owner's "Add a gift" and the guest's "Propose a gift".
- When editing an existing gift, a changed link asks before touching anything.
- If the page cannot be read, the form behaves exactly as it does today, with one quiet note.
- Free: no paid API, no new third-party account.

## Non-goals

- Amazon-specific import, Product Advertising API, scraping that breaks a shop's terms (roadmap: considered, not planned). Amazon pages that happen to work via standard page metadata are fine; pages that block us are not worked around.
- Rendering JavaScript (headless browser). Shops that only show their data after scripts run fall back to manual entry.
- Copying images into Kageo storage. The image stays a link to the shop's picture (owners' decision).
- Price tracking, price alerts, caching previews on the server, or storing anything about fetched pages.
- Affiliate links or rewriting the pasted link.

## Anti-goals

- Overwriting something the person already typed.
- A scary error when a shop blocks us or the page is odd.
- The server being usable to reach internal addresses or to hammer other sites (SSRF, abuse).
- The wish being saved with data the person never saw: everything filled in appears in the form and can be edited before saving.

## What the person sees

**The link field moves to the top** of the shared wish form (`entities/wish/ui/WishForm.tsx`, used by Add, Propose and Edit), and is the place to paste. It is the existing purchase link field: whatever is pasted stays in it and is saved as the purchase link.

**Add and Propose (owner's decision): fills by itself when pasted.** No button.
- Triggers on paste, and on leaving the field when its value changed and is a valid URL. Never per keystroke.
- Fills only fields that are still empty (name empty, description empty, image link empty, price 0 or empty). A field the person already filled is left alone. Currency is set only when the price is filled by the import.
- While fetching, the form stays usable; a small "looking for the details…" line shows under the link.
- Success note: "Found it, filled in below. Check and change anything." Nothing found or failed: "Couldn't read this site, fill in by hand." Both short, fr and en.

**Edit (owner's decision): changing the link on an existing gift asks first.** When the link differs from the saved one, an inline question appears under the field: "This link is different. Replace the current info with what the new link gives?" with two answers, **Replace** and **Keep my info**. Nothing is fetched until they answer.
- Keep: the new link is kept, nothing else changes.
- Replace: the page is fetched and every field the page provides is overwritten (our call: a field the page does not provide is left as it was, not blanked).

Priority and notes are never filled or changed by an import.

## What gets read from the page (our call)

Best effort, in this order of preference per field:
- Name: schema.org Product `name` (JSON-LD), then `og:title`, then `<title>`.
- Description: `og:description`, then `<meta name="description">`, then JSON-LD `description`.
- Image: `og:image`, then JSON-LD `image`; relative URLs resolved against the page; must end up `http(s)`.
- Price and currency: JSON-LD Product `offers` (`price` / `lowPrice`, `priceCurrency`), then `product:price:amount` / `og:price:amount` with their currency tags, then `itemprop="price"`. Decimal commas ("129,90") and thousands separators are handled; a price that cannot be read as a positive number is left empty.
- Currency: the form stores a symbol chosen from its currency select, so an ISO code from the page is mapped to the select's options. A code with no matching option leaves the currency (and price) unfilled rather than guessing.
- Text is trimmed, HTML entities decoded and cut to the form's existing length limits.

## How it works (our call)

A new authenticated route handler takes a URL and returns the extracted fields as JSON; the browser cannot read other sites itself. Any signed-in user may call it (guests who propose a gift have an account). The client side is a feature hook plus an API wrapper in `shared/api`, following the repo's data flow.

**Safety of the fetch** (this is the risky part and is required, not optional):
- Only `http` and `https`, on ports 80 and 443.
- Refuse any address that is private, loopback, link-local, multicast, or otherwise non-public, for IPv4 and IPv6, including the cloud metadata address. Check the address the connection actually uses (resolve first, then connect to that resolved address) so a hostname that resolves to an internal address, or changes after the check, cannot get through.
- Follow at most 3 redirects, and apply the same checks to every hop.
- Total time limit of about 5 seconds; stop reading after about 1 MB; accept only HTML responses.
- Send no cookies or credentials, and a plain User-Agent that identifies Kageo.
- Never return the raw page or error details from the target to the client; only the extracted fields or a generic "couldn't read".

**Rate limit:** reuse the limiter from the rate-limiting work. A new write-style group `import` per account, about 20 per 10 minutes (our call), plus the existing per-IP ceiling. A throttled import shows the normal calm message and the form still works by hand.

## Constraints

- Follow the repo conventions in `CLAUDE.md`: FSD layering, `@/*` alias, every user-visible string in both `fr.json` and `en.json`, CSS Modules, no new UI framework.
- Prefer no heavy new dependencies; a small HTML parser on the server is fine if it clearly beats hand-rolled parsing. Nothing from this runs in the browser bundle.
- Do not change KV data or key schema. The saved wish is the same shape as today.
- Update `docs/roadmap.md` (move Launch item 6 to Done) and `docs/architecture.md` (new route, new rate-limit group) in the same change.
- Existing tests must keep passing; add tests with the same style as the repo (Vitest, in-memory fake KV where needed, `src/app/api/**` route tests).

## Tests that matter

- Extraction from realistic HTML fixtures: JSON-LD only, Open Graph only, both, neither; decimal-comma prices; missing image; relative image URL; unknown currency.
- Safety: `localhost`, `127.0.0.1`, `10.x`, `192.168.x`, `169.254.169.254`, IPv6 loopback, a hostname that resolves to a private address, a redirect to a private address, non-http schemes, an oversized body, a response that never ends, a non-HTML response. Each must fail as "couldn't read" without the server making the forbidden request.
- Form behaviour: empty fields are filled and typed ones are left alone (Add/Propose); a changed link on Edit asks first and nothing happens until answered; Replace overwrites only fields the page provided.
- The route requires a session and is rate limited.

## Calls made while writing this (not yet confirmed by the owners)

- **Runtime:** the route runs on the Node.js runtime (the Vercel default, not Edge), with a custom lookup / pinned-address connection while TLS is still validated against the original hostname. No outbound proxy is involved.
- **Edit, nothing found:** if Replace fetches a page that yields no fields, show the "couldn't read" note and change nothing. If the saved gift has no link yet, adding one on Edit behaves like Add (fills empty fields only, no question).
- **"Empty" price:** the form already rejects a price of 0 or less, so a price of 0, empty or NaN counts as unfilled.
- **Stale responses:** the latest request wins; an older response that arrives late is discarded, and emptiness of each field is checked when the response arrives, not when the request started.
- **Duplicate triggers:** the same URL is never fetched twice in a row (paste then blur counts once). Every call that reaches the route counts against the `import` limit, including failed ones.

## Left to the builder

- Route name and shape, exact module layout, parser choice, how DNS resolution and the pinned connection are done.
- Exact wording of the notes and of the Replace/Keep question (fr and en), as long as the meaning above is kept.
- Which currency symbols the select offers today and the ISO-to-symbol table.
- Debounce details for the paste/blur trigger.
