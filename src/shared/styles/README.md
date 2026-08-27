# Styles & Design Tokens

The token system is split in two:

| File | Holds |
|------|-------|
| `theme.css` | **Semantic, theme-aware color tokens** — light + dark. Single source of truth for color. |
| `variables.css` | **Non-color primitives** — spacing, typography, radius, border widths, transitions, and a couple of non-themed shadow helpers. |
| `globals.css` | Global element styles + Tailwind directives + `.text-balance`. |
| `reset.css` | CSS reset. |

## `theme.css` — semantic color tokens

All colors are consumed as `var(--token)`. Never hardcode a hex in a rule body.

Token groups:

- **Surfaces** — `--surface-page`, `--surface-raised`, `--surface-sunken`, `--surface-sunken-2`, `--surface-input`
- **Borders** — `--border-default`, `--border-soft`, `--border-strong`
- **Text** — `--text-primary`, `--text-secondary`, `--text-tertiary`
- **Accent** (sage) — `--accent`, `--accent-hover`, `--accent-contrast`, `--accent-tint-bg`, `--accent-tint-border`
- **Amber** — `--amber`, `--amber-tint-bg`
- **Status** — `--status-{wanted,purchased,reserved,proposed,high}-{fg,bg}`
- **Error** — `--error-fg`, `--error-bg`, `--error-border`
- **Note** (WishCard) — `--note-accent`, `--note-bg`, `--note-border`, `--note-label`
- **Shadows** — `--shadow-card`, `--shadow-hover`, `--shadow-modal` (values differ per theme)
- **Fonts** — `--font-serif`, `--font-sans`, `--font-mono` (bound to the `next/font` CSS vars on `<html>`)

### The three-block pattern

Each token is declared three times so every resolution path lands on the same value:

1. `:root { … }` — the **light** palette + `color-scheme: light`.
2. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` — dark values for the **`system`** preference (no `[data-theme]` attribute is set).
3. `:root[data-theme="dark"] { … }` — identical dark values for the **explicit** dark choice.

`[data-theme]` is set only for explicit `light`/`dark`; `system` sets no attribute and lets the media query decide.

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
`--transition-*` / `--easing-*`, and the non-themed `--shadow-sm/md/lg/xl`,
`--shadow-button-hover`, `--shadow-card-hover` helpers. These do not vary by theme.
