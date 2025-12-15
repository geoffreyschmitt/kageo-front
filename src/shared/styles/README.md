# Design Tokens Usage Guide

This directory contains the design token system for the application, providing both CSS custom properties and TypeScript tokens for consistent styling across the codebase.

## Files

- `variables.css` - CSS custom properties (CSS variables) for use in CSS Modules
- `theme.ts` - TypeScript theme object with type-safe token access
- `globals.css` - Global styles
- `reset.css` - CSS reset

## Usage

### CSS Modules (Recommended)

Use CSS custom properties with `var()` in your `.module.css` files:

```css
/* Button.module.css */
.button {
  padding: var(--spacing-200) var(--spacing-300);
  background-color: var(--color-primary-main);
  color: var(--color-text-inverse);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  transition: var(--transition-all-fast);
}

.button:hover {
  background-color: var(--color-primary-hover);
  box-shadow: var(--shadow-button-hover);
}
```

### TypeScript/React

Import the theme object for programmatic access:

```typescript
import { theme } from '@/shared/styles/theme';

// Access spacing
const padding = theme.spacing[200]; // "var(--spacing-200)"

// Access colors
const primaryColor = theme.colors.primary.main; // "var(--color-primary-main)"
const statusColor = theme.colors.status.wanted; // "var(--color-status-wanted)"

// Access typography
const fontSize = theme.typography.fontSize.xl; // "var(--font-size-xl)"
const fontWeight = theme.typography.fontWeight.bold; // 700

// Access shadows
const cardShadow = theme.shadows.card; // "var(--shadow-card)"

// Access borders
const borderRadius = theme.borders.radius.lg; // "var(--border-radius-lg)"

// Access transitions
const transition = theme.transitions.all.fast; // "var(--transition-all-fast)"
```

### Helper Functions

Use helper functions for common operations:

```typescript
import { getSpacing, getColor, prefersDarkMode } from '@/shared/styles/theme';

// Get spacing value
const spacing = getSpacing(200); // "var(--spacing-200)"

// Get color value
const color = getColor('primary.main'); // "var(--color-primary-main)"
const statusColor = getColor('status.purchased'); // "var(--color-status-purchased)"

// Check dark mode preference
if (prefersDarkMode()) {
  // Handle dark mode logic
}
```

## Token Categories

### Spacing

Spacing tokens use a numeric scale where each increment of 100 represents 8px:

- `--spacing-100` = 8px
- `--spacing-200` = 16px
- `--spacing-300` = 24px
- `--spacing-400` = 32px
- `--spacing-500` = 40px
- `--spacing-600` = 48px
- `--spacing-800` = 64px
- `--spacing-1000` = 80px

**Usage:**
```css
.container {
  padding: var(--spacing-200);
  gap: var(--spacing-300);
  margin-bottom: var(--spacing-400);
}
```

### Colors

#### Primary Colors
- `--color-primary-main` - Main primary color
- `--color-primary-hover` - Hover state
- `--color-primary-active` - Active/pressed state
- `--color-primary-light` - Light variant (with opacity)
- `--color-primary-light-hover` - Light variant hover

#### Semantic Colors
- `--color-success-main`, `--color-success-hover`, `--color-success-light`
- `--color-error-main`, `--color-error-hover`, `--color-error-light`
- `--color-warning-main`, `--color-warning-hover`, `--color-warning-light`
- `--color-info-main`, `--color-info-hover`, `--color-info-light`

#### Neutral Colors
- `--color-neutral-50` through `--color-neutral-900` - Gray scale

#### Status Colors
- `--color-status-wanted` - Blue
- `--color-status-purchased` - Green
- `--color-status-reserved` - Purple
- `--color-status-proposed` - Orange

#### Priority Colors
- `--color-priority-high` - Red
- `--color-priority-medium` - Orange
- `--color-priority-low` - Green

#### Background & Foreground
- `--color-background` - Main background
- `--color-background-secondary` - Secondary background
- `--color-background-tertiary` - Tertiary background
- `--color-foreground` - Main foreground/text
- `--color-foreground-secondary` - Secondary text
- `--color-foreground-tertiary` - Tertiary text

#### Text Colors
- `--color-text-primary` - Primary text color
- `--color-text-secondary` - Secondary text color
- `--color-text-tertiary` - Tertiary text color
- `--color-text-inverse` - Inverse text (for dark backgrounds)

**Usage:**
```css
.card {
  background-color: var(--color-background);
  color: var(--color-text-primary);
  border: var(--border-width-thin) solid var(--color-border);
}

.button--primary {
  background-color: var(--color-primary-main);
  color: var(--color-text-inverse);
}

.button--primary:hover {
  background-color: var(--color-primary-hover);
}
```

### Typography

#### Font Sizes
- `--font-size-xs` = 10px
- `--font-size-sm` = 11px
- `--font-size-base` = 12px
- `--font-size-md` = 13px
- `--font-size-lg` = 14px
- `--font-size-xl` = 16px
- `--font-size-2xl` = 18px
- `--font-size-3xl` = 20px
- `--font-size-4xl` = 36px
- `--font-size-5xl` = 48px

#### Font Weights
- `--font-weight-normal` = 400
- `--font-weight-medium` = 500
- `--font-weight-semibold` = 600
- `--font-weight-bold` = 700
- `--font-weight-extrabold` = 800

#### Line Heights
- `--line-height-tight` = 1.1
- `--line-height-normal` = 1.3
- `--line-height-relaxed` = 1.4
- `--line-height-loose` = 1.6

#### Letter Spacing
- `--letter-spacing-normal` = 0
- `--letter-spacing-wide` = 0.5px

**Usage:**
```css
.heading {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.body {
  font-size: var(--font-size-lg);
  line-height: var(--line-height-relaxed);
}

.uppercase {
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}
```

### Shadows

#### Elevation Shadows
- `--shadow-sm` - Small shadow
- `--shadow-md` - Medium shadow
- `--shadow-lg` - Large shadow
- `--shadow-xl` - Extra large shadow

#### Semantic Shadows
- `--shadow-button-hover` - Button hover effect
- `--shadow-card` - Card default shadow
- `--shadow-card-hover` - Card hover shadow
- `--shadow-modal` - Modal overlay shadow

**Usage:**
```css
.card {
  box-shadow: var(--shadow-card);
}

.card:hover {
  box-shadow: var(--shadow-card-hover);
}

.modal {
  box-shadow: var(--shadow-modal);
}
```

### Borders

#### Border Radius
- `--border-radius-sm` = 4px
- `--border-radius-md` = 6px
- `--border-radius-lg` = 8px
- `--border-radius-xl` = 12px
- `--border-radius-2xl` = 16px
- `--border-radius-full` = 9999px (fully rounded)

#### Border Widths
- `--border-width-thin` = 1px
- `--border-width-medium` = 2px

**Usage:**
```css
.button {
  border-radius: var(--border-radius-lg);
  border: var(--border-width-medium) solid var(--color-border);
}

.avatar {
  border-radius: var(--border-radius-full);
}
```

### Transitions

#### Durations
- `--transition-fast` = 0.2s
- `--transition-base` = 0.3s

#### Easing
- `--easing-standard` = ease
- `--easing-smooth` = ease-in-out

#### Combined Transitions
- `--transition-all-fast` = all 0.2s ease
- `--transition-all-base` = all 0.3s ease
- `--transition-transform-fast` = transform 0.2s ease
- `--transition-transform-base` = transform 0.3s ease

**Usage:**
```css
.button {
  transition: var(--transition-all-fast);
}

.card {
  transition: var(--transition-transform-base);
}
```

## Dark Mode

Dark mode is automatically handled via `@media (prefers-color-scheme: dark)`. All color tokens automatically switch to dark mode variants when the user's system preference is set to dark mode.

No additional code is needed - the CSS variables automatically update based on the user's preference.

## Examples

### Complete Component Example

```css
/* WishCard.module.css */
.wishCard {
  background: var(--color-background);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-200);
  transition: var(--transition-all-fast);
}

.wishCard:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.wishCard__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-100);
}

.wishCard__price {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-success-main);
}

.wishCard__button {
  padding: var(--spacing-100) var(--spacing-200);
  background-color: var(--color-primary-main);
  color: var(--color-text-inverse);
  border-radius: var(--border-radius-md);
  transition: var(--transition-all-fast);
}

.wishCard__button:hover {
  background-color: var(--color-primary-hover);
  box-shadow: var(--shadow-button-hover);
}
```

### TypeScript Example

```typescript
import { theme, getSpacing, getColor } from '@/shared/styles/theme';

// Inline styles (when needed)
const cardStyle = {
  padding: theme.spacing[200],
  backgroundColor: theme.colors.background.default,
  borderRadius: theme.borders.radius.lg,
  boxShadow: theme.shadows.card,
};

// Dynamic styling
const getStatusColor = (status: 'wanted' | 'purchased' | 'reserved' | 'proposed') => {
  return theme.colors.status[status];
};

// Using helper functions
const spacing = getSpacing(300); // "var(--spacing-300)"
const primaryColor = getColor('primary.main'); // "var(--color-primary-main)"
```

## Best Practices

1. **Always use tokens** - Never hardcode color values, spacing, or other design values
2. **Use CSS Modules** - Prefer CSS custom properties in `.module.css` files over inline styles
3. **Use semantic tokens** - Prefer semantic color names (`primary`, `success`) over specific colors (`blue`, `green`)
4. **Leverage dark mode** - All tokens automatically support dark mode, no additional work needed
5. **Type safety** - Use TypeScript theme object when you need programmatic access for type checking

## Migration

When migrating existing components:

1. Replace hardcoded colors with `var(--color-*)` tokens
2. Replace hardcoded spacing with `var(--spacing-*)` tokens
3. Replace hardcoded font sizes with `var(--font-size-*)` tokens
4. Replace hardcoded shadows with `var(--shadow-*)` tokens
5. Replace hardcoded border-radius with `var(--border-radius-*)` tokens
6. Replace hardcoded transitions with `var(--transition-*)` tokens

Example migration:
```css
/* Before */
.button {
  padding: 14px 28px;
  background-color: #3b82f6;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* After */
.button {
  padding: var(--spacing-200) var(--spacing-300);
  background-color: var(--color-primary-main);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
}
```
