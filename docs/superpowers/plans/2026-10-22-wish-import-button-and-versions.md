# Wish import: button, product versions, share-text links — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the automatic import with a "Fill in for me" button, ask which product version the person means on pages that list several, and pull a link out of phone share text.

**Architecture:** The route keeps its safety/limits and gains an optional `variants` list in its response. Pure client helpers (link extraction, closest-price version match, version merging) feed a simplified `useLinkImport` hook with explicit states (`idle | loading | found | notFound | chooseMode | chooseVersion`). `WishForm` renders the button and the two questions. The three feature models keep calling the hook with the same params.

**Tech Stack:** Next.js 16 route handler (Node), React 19 hooks, next-intl, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-wish-import-from-url-design.md` — read the **Revision 2** section first (it supersedes the auto-import parts), then the **Addendum** and its "Calls made" list.

Work on branch `feat/wish-import` (already checked out; do not create another). Prefix shell commands with `rtk`, but run Vitest as plain `npx vitest run <file>`. Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. The existing import feature (merged on this branch) is the starting point: `src/shared/lib/extractWishFields.ts`, `src/app/api/wish/import/route.ts`, `src/shared/api/wish/importFromUrl.ts`, `src/entities/wish/model/{applyImport,linkImportPolicy,useLinkImport}.ts`, `src/entities/wish/ui/WishForm.tsx`, the three feature models, `e2e/wish-import.spec.ts`.

## Global Constraints

- No fetch on paste, typing or blur: only the button starts an import. The button is `type="button"`, disabled while loading and while the link field contains no http(s) link; labels "Fill in for me" / "Remplir pour moi".
- On press: the first http(s) link in the field's text is extracted (trailing `. , ) ! ?` removed); if the field held anything else, it is replaced by exactly that link; then import.
- Add/Propose and Edit-without-saved-link: fill only empty fields (name/description/imageUrl empty after trim; price ≤ 0 or NaN); currency only with a price; priority and notes never touched.
- Edit with a saved (non-empty) link: pressing first asks "Replace the current info, or only fill the empty fields?" — answers `Replace` / `Only fill empty` (fr `Remplacer` / `Remplir les champs vides`); no fetch before the answer; Replace overwrites every provided field and never blanks one; Only fill empty = Add behaviour.
- `variants`: at most 10 after de-duplication by (label, price, currency); more than 10 → no variants, no price (nothing asked); versions without price/currency are KEPT. When versions are detected, the backup price tags (`og:price`, `product:price:*`, `itemprop`) are not used and `fields` has no price/currency. Response: `{ found, fields, variants? }`; `found` is true when `fields` or `variants` has content.
- Variant shape: `{ label: string; name?: string; description?: string; imageUrl?: string; price?: number; currency?: string }` with the same length limits (name ≤ 200, description ≤ 5000), http(s) image rule and "price only with a mapped currency" rule as `fields`.
- Version naming (not translated, from the page): label = version `name`, else size and colour joined with " / ", else SKU, else empty (the UI then shows the price); filled name = the version's name if it already contains the product name (case-insensitive), else "<product name> <version name>"; filled description = the version's own description, else the product's; when the label is not already contained in the filled name or description, it goes on a first line followed by a blank line before the description.
- After an import with `variants` in fill-only-empty mode: if a price is already typed, pick the priced version closest to it and accept it only if |difference| ≤ max(1.00, 1% of the typed price) and strictly closer than every other priced version; confident → apply that version's data (never overwriting the typed price); not confident → apply only the product-level name/description/image to empty fields, ask nothing. No typed price (or Replace) → show the question "We found several versions of this product, which one is yours?" (fr "Nous avons trouvé plusieurs versions de ce produit, laquelle est la vôtre ?") with one button per version (label + price when present), nothing applied until a choice.
- While the version question shows: typing a price dismisses it and applies the product-level name/description/image to the empty fields; changing the link field dismisses it applying nothing; submit/cancel/reset applies nothing.
- Failure/nothing found: quiet note "Couldn't read this site, fill in by hand."; 429: the existing toast, form usable (status back to idle, no note). After a saved Add/Propose the import state resets (`reset()`), as today.
- Safety rules, rate limit (`import`, 20 per 600 s), field limits and server-only status of `extractWishFields.ts`/`fetchHtml.ts` are unchanged. `import type` only from `@/shared/lib/extractWishFields` in client files.
- Buttons ≥ 44 px tall; status/question regions polite live regions; every string in both `fr.json` and `en.json` with identical key sets; FSD layering; `@/*` alias; no testing-library added.
- Existing tests keep passing, except tests of code this plan deliberately removes (listed in Task 4).

## Review Focus

- Typed price "149", "150" and "149,5" all select the 149.99 version among {149.99, 179.99}; "140" (not within tolerance) and an exact tie between two versions select none and ask nothing (Task 2 tests).
- A page whose versions have no prices still produces the question and the chosen version fills name/description/image without touching the price (Tasks 1–3).
- The share text "Regarde ça : https://shop.fr/p/12?x=1." becomes exactly `https://shop.fr/p/12?x=1` (Task 2 tests), and a field with no link leaves the button disabled (Task 3).
- Pressing the button twice quickly makes one request; a late answer after `reset()` never touches the next form (Task 3/4).
- On pages with several versions no backup price tag ever fills a price (Task 1 tests).

---

### Task 1: Versions from the server

**Files:**
- Modify: `src/shared/lib/extractWishFields.ts`, `src/app/api/wish/import/route.ts`
- Test: `src/shared/lib/extractWishFields.test.ts`, `src/app/api/wish/import/route.test.ts`

**Interfaces:**
- Produces in `extractWishFields.ts`:
  - `type TImportedVariant = { label: string; name?: string; description?: string; imageUrl?: string; price?: number; currency?: string }`
  - `type TImportResult = { fields: TImportedFields; variants?: TImportedVariant[] }`
  - `extractWishData(html: string, pageUrl: string): TImportResult` — the new main entry; `extractWishFields(html, pageUrl): TImportedFields` stays and returns `extractWishData(...).fields`.
- Produces the route response `200 { found: boolean; fields: TImportedFields; variants?: TImportedVariant[] }` (never a 5xx; unchanged failure shape `{ found: false, fields: {} }`).

- [ ] **Step 1: Write failing tests** (extractor): JSON-LD Product with several offers that cannot be matched to the page URL and have different prices → `variants` (one per offer; `label` from offer `name`, else `sku`) and `fields` without price/currency; same fixture plus `og:price:amount` and an `itemprop` price → still no price in `fields` (backup tags ignored); offers without prices → variants kept with no price; ProductGroup with `hasVariant` entries (each a Product with `name`, `image`, `description`, `size`/`color`, `offers`) → variants with labels "size / color" or name; duplicate versions collapsed; 11 distinct versions → no `variants` and no price; a single priced offer, a URL-matching offer and all-equal prices behave exactly as before (existing tests keep passing); every variant respects the length limits and drops non-http(s) images. Route tests: `variants` is passed through in the response with `found: true`; fields-only and variants-only pages are `found: true`; unreadable pages unchanged.
- [ ] **Step 2: Run** `npx vitest run src/shared/lib/extractWishFields.test.ts src/app/api/wish/import/route.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `extractWishData` and the route change. Keep the scanner/caps/linear-time behaviour intact; the pathological-input tests must still pass in milliseconds.
- [ ] **Step 4: Run** the two files and `npx vitest run` — expect PASS.
- [ ] **Step 5: Commit** `feat(import): return product versions from the import route`.

---

### Task 2: Client pure logic

**Files:**
- Create: `src/entities/wish/model/importHelpers.ts`
- Modify: `src/shared/api/wish/importFromUrl.ts`, `src/entities/wish/model/applyImport.ts`, `src/entities/wish/model/useLinkImport.ts` (call site only), `src/entities/wish/model/index.ts`
- Test: `src/entities/wish/model/importHelpers.test.ts`, `src/entities/wish/model/applyImport.test.ts`

**Interfaces:**
- Consumes: `TImportedFields`, `TImportedVariant`, `TImportResult` (Task 1, `import type`).
- Produces:
  - `importWishFromUrl(url: string, signal?: AbortSignal): Promise<TImportResult | null>` (null when `found` is false; otherwise `{ fields, variants? }`).
  - `extractFirstUrl(text: string): string | null` — first `http(s)` link; trailing `. , ) ! ? ; :` stripped; `null` when none.
  - `findVersionByPrice(variants: TImportedVariant[], typedPrice: number): number | null` — index of the confident closest priced version per the Global Constraints, else `null`.
  - `composeVariantFields(base: TImportedFields, variant: TImportedVariant): TImportedFields` — the version's data over the product-level data per the naming rules.
  - `applyVersion(current: TImportableForm, base: TImportedFields, variant: TImportedVariant, mode: 'fillEmpty' | 'replace'): Partial<TImportableForm>` = `applyImport(current, composeVariantFields(base, variant), mode)`.
  - `applyImport`'s `TImportableForm`-based patch type is widened to allow `purchaseUrl`: export `type TFormPatch = Partial<TImportableForm & { purchaseUrl: string }>`.
- The existing `useLinkImport` keeps compiling (read `result.fields` where it read the fields); it is rewritten in Task 3.

- [ ] **Step 1: Write failing tests**: `extractFirstUrl`: exact link; "Regarde ça : https://shop.fr/p/12?x=1." → `https://shop.fr/p/12?x=1`; two links → first; "(https://a.com/x)" → `https://a.com/x`; `ftp://x`, `javascript:alert(1)`, `''`, plain words → `null`; leading/trailing whitespace. `findVersionByPrice` with {149.99, 179.99}: 149 → 0, 150 → 0, 149.5 → 0, 179 → 1, 140 → null (outside tolerance), 165 → null (not strictly closer than tolerance or too far), exact tie {100, 102} with typed 101 → null, a single priced version with typed 149.99 → 0, versions without prices → null, typed 0/NaN → null. `composeVariantFields`/`applyVersion` with the naming rules (name containing the product name; product name prefix; label line + blank line + description; description from the version vs product; label already contained in the name → no label line; missing version fields fall back to the base; version without price leaves price/currency untouched), fill-only-empty keeping a typed name/description/image, and Replace overwriting provided fields without blanking any.
- [ ] **Step 2: Run** `npx vitest run src/entities/wish/model` — expect FAIL.
- [ ] **Step 3: Implement** the helpers, the widened patch type, and the wrapper return type.
- [ ] **Step 4: Run** `npx vitest run`, `npx tsc --noEmit`, `npm run lint` — expect PASS.
- [ ] **Step 5: Commit** `feat(import): link extraction and version matching helpers`.

---

### Task 3: Button model — hook, form, wiring, copy

**Files:**
- Modify: `src/entities/wish/model/useLinkImport.ts` (rewrite), `src/entities/wish/ui/WishForm.tsx`, `src/entities/wish/ui/WishForm.types.ts`, `src/entities/wish/ui/WishForm.module.css`, `src/shared/i18n/messages/fr.json`, `src/shared/i18n/messages/en.json`; the three feature models only if their call to `useLinkImport` needs adapting (`src/features/{AddWish,ProposeWish,EditWish}/model.ts`)
- Delete (code no longer used): `decideLinkAction`, `shouldDismissQuestion`, `shouldCancelInFlight` and their tests in `linkImportPolicy.ts`/`.test.ts` (delete the files if nothing remains)

**Interfaces:**
- Consumes: Task 2 helpers; `TFormPatch`.
- Produces:
  - `type TLinkImport = { status: 'idle' | 'loading' | 'found' | 'notFound' | 'chooseMode' | 'chooseVersion'; versions: { label: string; price?: number; currency?: string }[]; canFill: boolean; onFill: () => void; onChooseMode: (mode: 'replace' | 'fillEmpty') => void; onChooseVersion: (index: number) => void; reset: () => void }`
  - `useLinkImport<T extends TImportableForm & { purchaseUrl: string }>(params: { formData: T; applyPatch: (patch: TFormPatch) => void; savedUrl?: string }): TLinkImport` (`savedUrl` defined = Edit mode; a non-empty saved link makes `onFill` go through `chooseMode`).
  - `WishForm` props: `linkImport?: TLinkImport` (unchanged name). The link input no longer has paste/blur handlers; below it the "Fill in for me" button (`wishForm__button`, `type="button"`, `disabled={!canFill || status === 'loading' || isSubmitting}`) and the live status region: `loading` "Looking for the details…", `found` "Found it, filled in below. Check and change anything.", `notFound` "Couldn't read this site, fill in by hand.", `chooseMode` the Edit question with `Replace` / `Only fill empty` buttons, `chooseVersion` the version question with one button per version (label, then price formatted with its currency when present; a version with no label shows only its price).
  - i18n keys under `wishForm.import` (identical sets in both locales): `fill`, `looking`, `found`, `notFound`, `modeQuestion`, `replace`, `fillEmpty`, `versionQuestion`; remove `replaceQuestion` and `keep`. Copy: en `fill` "Fill in for me", `modeQuestion` "Replace the current info, or only fill the empty fields?", `replace` "Replace", `fillEmpty` "Only fill empty", `versionQuestion` "We found several versions of this product, which one is yours?"; fr `fill` "Remplir pour moi", `modeQuestion` "Remplacer les informations actuelles, ou remplir seulement les champs vides ?", `replace` "Remplacer", `fillEmpty` "Remplir les champs vides", `versionQuestion` "Nous avons trouvé plusieurs versions de ce produit, laquelle est la vôtre ?"; `looking`/`found`/`notFound` keep their current texts.

- [ ] **Step 1: Define the behaviour in the hook**, state machine per the Global Constraints: `onFill` (extract link, put it in the field via `applyPatch({ purchaseUrl })` when the field held more, Edit-with-saved-link → `chooseMode`, else run); `run` (one request at a time via a request id and `AbortController`; `null` → `notFound`; 429-style error → `idle`; result without `variants` → `applyImport` with the mode and `found`; with `variants` → typed-price guess in fill-only-empty mode, otherwise `chooseVersion` holding the base fields, variants and mode in refs, nothing applied); `onChooseVersion` (apply that version with the stored mode, `found`); dismissal effects (price typed while `chooseVersion` → apply base fields to empty fields then `found`; link text changed from the asked one while `chooseMode`/`chooseVersion` → `idle`, nothing applied); `reset()` and unmount abort and bump the request id. Read the latest form through a ref when a response arrives.
- [ ] **Step 2: Run** `npx vitest run` and `npx tsc --noEmit` to find the removed-API breakages (the old e2e is rewritten in Task 4; expect it to fail until then).
- [ ] **Step 3: Implement** `WishForm` (button, status region, the two questions, ≥ 44 px answer buttons scoped to the import area in the CSS module, tokens only, light and dark) and the locale files; adapt the three models if needed (their `resetForm` still calls `linkImport.reset()`).
- [ ] **Step 4: Run** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — expect PASS (unit + build; e2e is Task 4).
- [ ] **Step 5: Commit** `feat(import): fill-in button and product version question`.

---

### Task 4: E2E rewrite, docs and verification

**Files:**
- Modify: `e2e/wish-import.spec.ts` (rewrite for the button model), `docs/architecture.md` (route response with `variants`, button flow, version rules, observed shops), `CHANGELOG.md`, `docs/roadmap.md` (Done entry wording: button, versions)
- Test: `e2e/wish-import.spec.ts`

**Interfaces:**
- Consumes: Task 3 UI. Mock the route with `page.route('**/api/wish/import', …)` as the existing spec does; a helper records requests.

- [ ] **Step 1: Write the e2e scenarios** (each fails first): (a) Add: typing/pasting a link makes NO request; pressing "Fill in for me" makes exactly one and fills the empty fields while a typed name stays; (b) the button is disabled with no link and while loading, and a double press makes one request; (c) share text in the field ("Regarde ça : <link>.") → pressing the button replaces the field with the bare link and imports; (d) not found shows the quiet note and the form submits by hand; (e) Propose as a guest works the same way; (f) Edit with a saved link: pressing shows the Replace / Only fill empty question and makes no request until answered; "Only fill empty" keeps old values and fills only empty ones; "Replace" overwrites only provided fields; (g) versions, no typed price: the question shows, nothing is applied until a version is chosen, choosing fills name/price/currency/description (with the label line)/image; (h) versions with a typed price 149 and versions {149.99, 179.99}: no question, the 149.99 version's name/description/image are applied and the price stays 149; typed 140: no question, only product-level fields applied; (i) versions without prices: the question shows, choosing fills name/description/image and leaves the price empty; (j) typing a price while the version question shows dismisses it and applies the product-level fields; changing the link dismisses it applying nothing; (k) a 429 shows "Too many tries, please wait a minute." and the form stays usable; (l) after a saved add and after a saved propose the reopened form is clean, the button state is fresh and the same link imports again.
- [ ] **Step 2: Run** `npm run test:e2e -- e2e/wish-import.spec.ts` — expect FAIL on the new scenarios, then implement nothing new unless a gap shows; fix gaps found in the earlier tasks' code and report them.
- [ ] **Step 3: Docs**: `docs/architecture.md` (response shape with `variants`, the button flow, version/price rules, the closest-price guess, observed shops), `CHANGELOG.md`, `docs/roadmap.md` (reword the 2026-10-22 Done entry).
- [ ] **Step 4: Run** `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e` — all green; report real counts.
- [ ] **Step 5: Commit** `feat(import): e2e and docs for the button and version flow`.
