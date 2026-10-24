# Styles & Design Tokens

The token system is split in two:

| File | Holds |
|------|-------|
| `theme.css` | **Semantic, theme-aware color tokens** — light + dark. Single source of truth for color. |
| `variables.css` | **Non-color primitives** — spacing, typography, radius, border widths, transitions, and non-themed shadow helpers. |
| `globals.css` | Global element styles + Tailwind directives + `.text-balance`. |
| `reset.css` | CSS reset. |

## `theme.css` — semantic color tokens

All colors are consumed as `var(--token)`. Never hardcode a hex in a rule body.

Token groups:

- **Surfaces** — `--surface-page`, `--surface-raised`, `--surface-sunken`, `--surface-sunken-2`, `--surface-input`
- **Borders** — `--border-default`, `--border-soft`, `--border-strong`, `--border-control` (field/control outline, 3:1)
- **Text** — `--text-primary`, `--text-secondary`, `--text-tertiary`
- **Accent** (sage) — `--accent`, `--accent-hover`, `--accent-contrast`, `--accent-solid`, `--accent-solid-shadow`, `--accent-tint-bg`, `--accent-tint-border`
- **Amber** — `--amber`, `--amber-tint-bg`
- **Status** — `--status-{wanted,purchased,reserved,proposed,high}-{fg,bg}`
- **Error** — `--error-fg`, `--error-bg`, `--error-border`, `--error-shadow`
- **Note** (WishCard) — `--note-accent`, `--note-bg`, `--note-border`, `--note-label`
- **Overlay** — `--scrim`
- **Shadows** — `--shadow-card`, `--shadow-hover`, `--shadow-modal` (values differ per theme)
- **Fonts** — `--font-serif`, `--font-sans`, `--font-mono` (bound to the `next/font` CSS vars on `<html>`)

### One declaration per colour

Every colour is a single `light-dark(light, dark)` value; `color-scheme` picks the side:

1. `:root { color-scheme: light dark }` — the **`system`** preference (no `[data-theme]` attribute).
2. `:root[data-theme="light"|"dark"] { color-scheme: … }` — the explicit choice pins the scheme.
3. Shadows can't use `light-dark()`, so only `--shadow-*` keep a dark override (media query + attribute).

Add or change a colour in ONE place. `[data-theme]` is set only for explicit `light`/`dark`; `system` sets no attribute and lets the media query decide.

## How component modules consume tokens

Each `*.module.css` opens with a **rescoped alias block** mapping its local
component tokens to the semantic ones, e.g.:

```css
.card {
    --wc-bg:     var(--surface-raised);
    --wc-border: var(--border-default);
    --wc-shadow: var(--shadow-card);
}
```

The rest of the module references only its local `--wc-*` aliases. Because the
semantic tokens are theme-aware, modules get dark mode for free. Module-local
dark tuning (e.g. gradient overlays) uses
`:root[data-theme="dark"] .x, @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .x }`.

## `variables.css` — non-color primitives

`--spacing-*`, `--font-size-*` / `--font-weight-*` / `--line-height-*` /
`--letter-spacing-*`, `--border-radius-*` / `--border-width-*`,
`--transition-*` / `--easing-*`, and the non-themed `--shadow-sm/md/lg/xl`
helpers. These do not vary by theme.
