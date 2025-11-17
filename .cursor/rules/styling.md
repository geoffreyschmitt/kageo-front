# Styling Guidelines

## 🎨 CSS Modules Only

**IMPORTANT**: This project uses **CSS Modules exclusively**. Do not use:
- ❌ Styled-components
- ❌ Tailwind CSS
- ❌ CSS-in-JS libraries
- ❌ Global CSS (except in `shared/styles/`)

## 📝 File Structure

- One `.module.css` file per component
- File name must match component name: `ComponentName.module.css`
- Located in the same folder as the component

## 🏷️ BEM Naming Convention

**IMPORTANT**: This project uses **BEM (Block Element Modifier)** convention for CSS class names.

### BEM Structure

- **Block**: Standalone component (e.g., `button`, `card`, `modal`)
- **Element**: Part of a block (e.g., `button__icon`, `card__header`)
- **Modifier**: Variation of a block or element (e.g., `button--primary`, `button__icon--large`)

### Naming Pattern

Format: `block__element--modifier`

- Use double underscore `__` to separate block from element
- Use double dash `--` to separate block/element from modifier
- Use camelCase for block names (e.g., `button`, `wishlistCard`)

### Examples

```css
/* Button.module.css */
.button { }                    /* Block */
.button--primary { }           /* Block modifier */
.button--secondary { }         /* Block modifier */
.button__icon { }              /* Element */
.button__icon--large { }       /* Element modifier */
.button__text { }              /* Element */
.button__text--bold { }        /* Element modifier */

/* WishlistCard.module.css */
.wishlistCard { }              /* Block */
.wishlistCard--featured { }    /* Block modifier */
.wishlistCard__header { }      /* Element */
.wishlistCard__title { }        /* Element */
.wishlistCard__title--large { } /* Element modifier */
.wishlistCard__actions { }     /* Element */
```

### Rules

1. **Always use BEM**: No exceptions, all CSS classes must follow BEM convention
2. **Block name = component name**: The block should match the component name (camelCase)
3. **No nesting in class names**: Don't create classes like `button__icon__arrow` (use `button__iconArrow` instead)
4. **Modifiers are optional**: Not all blocks/elements need modifiers
5. **One block per component**: Each component has one main block class

## 💻 Usage in Components

```typescript
import styles from './Component.module.css'

// Single class
<div className={styles.button}>

// Multiple classes with template literal
<div className={`${styles.button} ${styles['button--primary']} ${className}`}>

// Conditional classes
<div className={`${styles.input} ${error ? styles['input--error'] : ''}`}>
```

## 🎯 Best Practices

1. **Follow BEM strictly**: All class names must follow BEM convention
2. **Keep styles scoped**: Use component-specific class names
3. **Avoid deep nesting**: Keep CSS flat (max 2-3 levels)
4. **Use semantic names**: `button--primary` not `button--blue`
5. **Group related styles**: Keep related styles together
6. **Avoid !important**: Use specificity instead
7. **Block = Component**: The block name should match the component name

## 📂 Global Styles

Global styles are located in `src/shared/styles/`:
- `reset.css` - CSS reset
- `variables.css` - CSS custom properties
- `globals.css` - Global styles
- `theme.ts` - Theme configuration (if needed)

Only use global styles for:
- CSS resets
- CSS variables
- Base typography
- Layout utilities

