# Dark Mode — Design Spec

**Date:** 2026-08-27
**Status:** Approved

---

## Problem

Kageo has a single hardcoded light theme ("Garden Party"). Every one of ~28 CSS
modules declares its own `:root { --<prefix>-*: #hex }` block, mostly repeating
the same ~15 colors. `src/shared/styles/globals.css` hardcodes
`body { background: #f7f4ef }`. There is no way to switch appearance and no
central place a theme value lives.

This spec introduces a full light/dark theme system:

- a **central semantic token layer** consumed by every module;
- **theme resolution** that follows the browser by default and can be
  overridden per-device;
- a **System / Light / Dark** control on the profile page.

---

## Requirements (from the brief)

1. Colors driven by CSS variables, light and dark.
2. Default = follow the browser (`prefers-color-scheme`).
3. A control on the profile page overrides the browser choice.
4. Until the user touches that control, the app shows the browser value.
5. The override is stored **per device** (localStorage + cookie), not per account.

---

## Approach

**Semantic core + per-module alias remap.**

- New `src/shared/styles/theme.css` defines ~35 **semantic tokens** (`--surface-*`,
  `--text-*`, `--accent*`, `--amber*`, `--status-*`, `--border-*`, `--shadow-*`)
  in a light palette, with a dark palette applied via `prefers-color-scheme` and
  via an explicit `[data-theme]` attribute.
- Each module keeps its existing local names (`--g-sage`, `--wc-border`, …). Its
  `:root` block is **rescoped to the module's root selector** and rewritten as a
  thin remap onto semantic tokens: `.wishlist { --g-sage: var(--accent); … }`.
  One edited block per module; no change to the hundreds of `var(--g-*)` call
  sites.

Rejected alternatives:

- *Full inline replacement* of every `var(--g-*)` usage — hundreds of edits, high
  diff risk, no upside.
- *next-themes library* — localStorage-only; still flashes an explicit theme
  under SSR. The hand-rolled cookie-backed provider is ~60 lines and renders
  flash-free.

---

## Token architecture

### New file: `src/shared/styles/theme.css`

Imported **first** in the global chain (before `reset.css`, `variables.css`,
`globals.css`). Structure mirrors the standard three-block pattern:

```css
:root {
  /* complete LIGHT palette */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* complete DARK palette — every token redefined */
  }
}

:root[data-theme="dark"] {
  /* same DARK palette — explicit choice wins regardless of OS */
}
```

No token is ever defined *only* inside a media / attribute block — every one has
its base definition on bare `:root`.

### Semantic token set

| Token | Light | Dark |
|---|---|---|
| `--surface-page` | `#f7f4ef` | `#17130e` |
| `--surface-raised` | `#ffffff` | `#211b14` |
| `--surface-sunken` | `#f2ede5` | `#2a231a` |
| `--surface-sunken-2` | `#ebe5da` | `#322a1f` |
| `--surface-input` | `#faf8f4` | `#1a1611` |
| `--border-default` | `#d6cec4` | `#3d352a` |
| `--border-soft` | `#e5dfd5` | `#302a20` |
| `--border-strong` | `#a8a099` | `#4a4235` |
| `--text-primary` | `#1e1a16` | `#f3eee4` |
| `--text-secondary` | `#4e443c` | `#cabfb0` |
| `--text-tertiary` | `#6b6258` | `#9a9083` |
| `--accent` | `#3f6845` | `#8fc597` |
| `--accent-hover` | `#2e5033` | `#a6d6ad` |
| `--accent-contrast` | `#ffffff` | `#16130e` |
| `--accent-tint-bg` | `#eaf2eb` | `#1f2a21` |
| `--accent-tint-border` | `rgba(63,104,69,0.20)` | `rgba(143,197,151,0.28)` |
| `--amber` | `#6e3c0c` | `#e0a86e` |
| `--amber-tint-bg` | `#fdf0e6` | `#2c2116` |
| `--status-wanted-fg` | `#1a5491` | `#84b1e8` |
| `--status-wanted-bg` | `#edf3fb` | `#1a2434` |
| `--status-purchased-fg` | `#3f6845` | `#8fc597` |
| `--status-purchased-bg` | `#eaf2eb` | `#1c2a21` |
| `--status-reserved-fg` | `#4e3278` | `#b9a0e6` |
| `--status-reserved-bg` | `#f0ebf8` | `#251d34` |
| `--status-proposed-fg` | `#6e3c0c` | `#e0a86e` |
| `--status-proposed-bg` | `#fdf0e6` | `#2c2116` |
| `--status-high-fg` | `#8a2318` | `#e79184` |
| `--status-high-bg` | `#fdecea` | `#2f1b17` |
| `--error-fg` | `#8a2318` | `#e79184` |
| `--error-bg` | `#fdecea` | `#2f1b17` |
| `--error-border` | `rgba(138,35,24,0.20)` | `rgba(231,145,132,0.25)` |
| `--note-accent` | `#d4a843` | `#d4a843` |
| `--note-bg` | `#fffcf5` | `#1f1a12` |
| `--note-border` | `#ede4cc` | `#3a3222` |
| `--note-label` | `#6b5210` | `#e0a86e` |
| `--shadow-card` | `0 2px 12px rgba(60,45,25,0.08)` | `0 2px 14px rgba(0,0,0,0.45)` |
| `--shadow-hover` | `0 8px 28px rgba(60,45,25,0.13)` | `0 12px 40px rgba(0,0,0,0.55)` |
| `--shadow-modal` | `0 24px 64px rgba(60,45,25,0.18)` | `0 24px 64px rgba(0,0,0,0.65)` |
| `--font-serif` | `var(--font-cormorant, Georgia, serif)` | (same) |
| `--font-sans` | `var(--font-dm-sans, system-ui, sans-serif)` | (same) |
| `--font-mono` | `var(--font-mono, ui-monospace, monospace)` | (same) |

Dark values are lifted from the approved dark-twin mockup (contrast-checked
against the dark surfaces). Fonts move into the layer so modules stop repeating
the `var(--font-cormorant, …)` fallback string.

### Per-module conversion

Each `*.module.css` currently holding a `:root` block:

1. Change the selector from `:root` to the module's root class (`.wishlist`,
   `.wish-card`, `.panel`, `.header`, …) so tokens no longer leak globally.
2. Replace each hardcoded value with a semantic token alias:
   `--g-bg: var(--surface-page);` `--g-sage: var(--accent);`
   `--wc-reserv: var(--status-reserved-fg);` etc.
3. Where a module has a genuinely one-off color with no semantic equivalent, add
   a new semantic token for it rather than leaving a hardcoded hex.
4. **Module-local dark tuning** (only where needed): the subtle radial-gradient
   hero overlays (`rgba(63,104,69,0.07)` …) get a dark variant inside the
   module via `:root[data-theme="dark"] .wishlist__header::before { … }` plus the
   media-query twin. These are decorative; list is small (`wishlist__header`,
   `profile .hero`, `wishlist__empty`, WishCard state gradient overlays).

### Adjacent cleanup

- `src/shared/styles/globals.css`: `body { background: var(--surface-page);
  color: var(--text-primary); }`.
- `src/shared/styles/variables.css`: keep the spacing / typography / radius /
  transition tokens as-is. The `--color-*` block (already marked legacy) is
  removed in Phase 3 once nothing references it (grep-verified).
- `src/app/globals.css`: the shadcn `:root` / `.dark` HSL block drives only
  `body { @apply bg-background text-foreground }`, which is overridden by
  `shared/styles/globals.css`. Align the `.dark` selector logic to the same
  `[data-theme]` mechanism (or delete the unused half) in Phase 3.

---

## Theme resolution & no-flash

### State model

`preference ∈ { system, light, dark }`, default `system`.

| preference | `<html data-theme>` | Visual source |
|---|---|---|
| `system` | *absent* | CSS `@media (prefers-color-scheme)` |
| `light` | `"light"` | CSS `:root[data-theme="light"]` (= base `:root`) |
| `dark` | `"dark"` | CSS `:root[data-theme="dark"]` |

Because `system` never sets the attribute, there is never a flash on the default
path — CSS alone resolves it.

### Persistence

- `localStorage["kageo-theme"]` = `"light"` | `"dark"` (absent ⇒ `system`).
- Cookie `kageo-theme` = same values. `path=/; max-age=31536000; SameSite=Lax`.
  Not `HttpOnly` (client writes it). Cleared (`max-age=0`) when returning to
  `system`.
- Both are written together on every change.

### No-flash flow

1. **Server** — `layout.tsx` (already `async`) reads the `kageo-theme` cookie via
   `readThemeCookie()`. If `light`/`dark`, renders
   `<html data-theme={value} suppressHydrationWarning>`. If absent, `<html
   suppressHydrationWarning>` with no attribute.
2. **Inline script** — `themeInitScript` string injected in `<head>` via
   `<script dangerouslySetInnerHTML>`, runs before first paint: reads
   `localStorage` then cookie, reconciles `document.documentElement`'s
   `data-theme` (sets it for explicit, removes it for `system`). Covers
   CDN-cached HTML with a stale attribute and localStorage/cookie disagreement.
3. **Client** — `ThemeProvider` mounts, derives the same state from cookie
   (passed as `initialPreference` prop from the layout, so no client read needed
   for first render). Matches the server-rendered attribute ⇒ no hydration
   mismatch.

`suppressHydrationWarning` on `<html>` is required and standard; it silences
attribute mismatches on that node only.

### Runtime behavior

- **`prefers-color-scheme` changes while on `system`:** `ThemeProvider` holds a
  `matchMedia('(prefers-color-scheme: dark)')` listener that updates
  `resolvedTheme` in context. Visuals already follow via CSS; the listener exists
  so JS consumers (`useTheme().resolvedTheme`) stay correct.
- **Cross-tab:** `window` `storage` event listener re-reads preference and
  re-applies.
- **Storage unavailable (private mode):** writes are wrapped in try/catch; state
  falls back to in-memory for the session. App still works, choice just doesn't
  persist.

---

## Module structure (FSD)

### `src/shared/theme/` (new)

| File | Purpose |
|---|---|
| `ThemeProvider.tsx` | `'use client'`. React context. Props: `initialPreference`. Holds `preference` + `resolvedTheme`; `setPreference` writes cookie + localStorage and applies/removes `data-theme`; installs `matchMedia` + `storage` listeners. |
| `useTheme.ts` | Hook → `{ preference, setPreference, resolvedTheme }`. Throws if used outside the provider. |
| `readThemeCookie.ts` | Server helper. Parses `kageo-theme` from `next/headers` `cookies()`. Returns `'light' | 'dark' | 'system'`. |
| `themeInitScript.ts` | Exported minified script string (the pre-paint reconciler). |
| `constants.ts` | `THEME_STORAGE_KEY = 'kageo-theme'`, `THEME_COOKIE = 'kageo-theme'`, `THEME_VALUES`. |
| `index.ts` | Barrel. |

Imports nothing from higher layers.

### `src/app/[locale]/layout.tsx` (edit)

```tsx
const themePreference = await readThemeCookie()
const dataTheme = themePreference === 'system' ? undefined : themePreference

<html
  lang={locale}
  className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
  data-theme={dataTheme}
  suppressHydrationWarning
>
  <head>
    <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
  </head>
  <body>
    <ThemeProvider initialPreference={themePreference}>
      <NextIntlClientProvider messages={messages}>
        <AuthProvider>…</AuthProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  </body>
</html>
```

(Explicit `<head>` is added; App Router allows it.)

### `src/features/ThemeToggle/` (new)

| File | Purpose |
|---|---|
| `model.ts` | Re-exports `useTheme`; exports `THEME_OPTIONS = [{ value, labelKey }]` for `system`/`light`/`dark`. |
| `ui/ThemeToggle.tsx` | Segmented control. `role="group"`, three `<button type="button">`, active one `aria-pressed="true"` + `--active` class. Arrow-key navigation between buttons. Calls `setPreference`. |
| `ui/ThemeToggle.module.css` | Pill container + segment styling using semantic tokens. |
| `index.ts` | Barrel. |

FSD: `features/ThemeToggle` → `shared/theme` only. `views/profile` →
`features/ThemeToggle`.

---

## Profile control

`ProfilePage.tsx`, inside the existing **Preferences** `<Panel>`, add an
"Appearance" row (same `.preference` layout as "Public profile"):

```
Appearance
Choose how Kageo looks. "System" follows your device settings.
                                              [ System | Light | Dark ]
```

- The control is right-aligned in the row like the existing toggle.
- No async, no error/saved state — `setPreference` is synchronous.
- New i18n keys under `profile.*` in **every** `src/shared/i18n/messages/*.json`:
  `appearanceTitle`, `appearanceDesc`, `themeSystem`, `themeLight`, `themeDark`.
- New `.segmented`, `.segmented__option`, `.segmented__option--active` classes in
  `profile.module.css`, semantic-token styled (active = `--accent` fill +
  `--accent-contrast` text).

---

## Phasing

The implementation plan splits into three phases; **Phase 1 is a shippable
increment** (dark mode complete on the three mocked pages).

### Phase 1 — infra + tokens + primary surfaces

- `src/shared/styles/theme.css` (full token layer).
- `src/shared/theme/*` (provider, hook, cookie reader, init script).
- `layout.tsx` wiring.
- `src/shared/styles/globals.css` body fix.
- `src/features/ThemeToggle/*` + profile control + i18n keys.
- Convert modules: `views/wishlist/wishlist.module.css`,
  `views/profile/ui/profile.module.css`, `widgets/Header/Header.module.css`,
  `widgets/WishCard/WishCard.module.css`, `shared/ui/Panel`, `shared/ui/Modal`,
  `shared/ui/Button`, `shared/ui/Toast`, `shared/ui/Tabs`.

### Phase 2 — remaining modules

`widgets/WishlistCard`, `widgets/WishlistList`, `entities/wish/ui/WishForm`,
`entities/wishlist/ui/WishlistForm`, `views/publicProfile`, and all feature
modules with `:root` blocks: `AddWish`, `EditWish`, `ContributePot`,
`CreatePot`, `Comments`, `ShareWishlist`, `FilterWishlistOwner`, `PotDashboard`,
`DeleteWish` / `DeleteWishlist` confirmation modals, `ProposeWish`; plus
`app/[locale]/page.module.css` and `app/[locale]/features/page.module.css`.

### Phase 3 — legacy cleanup

- Remove `--color-*` block from `variables.css` (grep-verified unused).
- Reconcile / remove the `app/globals.css` shadcn `.dark` block.
- Remove any now-dead hardcoded hex left in converted modules.

---

## Testing

No test runner is configured in this repo. Verification per phase:

- `pnpm build` — clean.
- `pnpm lint` — clean.
- `grep` each converted module for leftover 3/6-digit hex literals and for
  `var(--…)` names that resolve to nothing.
- Manual matrix:
  - light; dark; system (OS light); system (OS dark);
  - each transition System→Light→Dark→System via the profile control;
  - **hard reload** on an explicit theme — no flash of the other theme;
  - second tab open — changing theme in tab A updates tab B;
  - private-window — control still works, choice not persisted, no error.

---

## Risks

- **Dark tint pairs** (accent-on-accent-tint, status-fg-on-status-bg) are
  re-derived, not computed — the mockup establishes them and the token table
  above carries the values. Any pair that reads poorly is a one-line token edit.
- **Rescoping `:root` → component class** could change the cascade for a rule
  that unintentionally leaned on a globally-defined var. Mitigated by keeping the
  same local var names and by the per-phase grep + visual pass.
- **`suppressHydrationWarning` on `<html>`** silences all attribute mismatches on
  that node, not just theme. Accepted — it is the standard trade-off for
  server-rendered theming.
- **Decorative gradient overlays** use `rgba()` of the old sage/amber; on dark
  they need lower-alpha variants. Scoped list is short (4 selectors) and handled
  in module-local dark blocks.
