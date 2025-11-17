# AI Directives

This document contains specific instructions for AI assistants working on this codebase.

## 🎯 When Creating New Components

### 1. Complete Structure

Always create the complete file structure:

```
ComponentName/
├── ComponentName.tsx
├── ComponentName.types.ts
├── ComponentName.module.css
└── index.ts
```

### 2. Respect FSD Architecture

- Determine the correct layer (widget/feature/entity/shared)
- Verify dependencies between layers
- Never create circular dependencies

### 3. Use Path Aliases

- Always use `@/shared/ui` instead of relative paths
- Verify imports follow ESLint order
- Use named exports from `index.ts` files

### 4. Type Everything

- All types with `T` prefix
- Props typed in separate `.types.ts` file
- Function parameters and return types explicitly typed

### 5. CSS Modules

- One `.module.css` file per component
- **BEM convention**: Use strict BEM naming (`block__element--modifier`)
- Block name should match component name in camelCase
- Import as: `import styles from './Component.module.css'`

### 6. Export from index.ts

- Public exports only
- Facilitate imports from other layers
- Export types alongside components

## 🔧 When Modifying Existing Code

### 1. Maintain Consistency

- Follow existing patterns in the file
- Respect the folder structure
- Match the coding style

### 2. Check Imports

- Use path aliases
- Respect ESLint import order
- Remove unused imports

### 3. Don't Break Architecture

- Don't create circular dependencies
- Respect layer import rules
- Maintain separation of concerns

## ❌ Code to Avoid

**DO NOT use:**
- Styled-components, Tailwind, or other CSS-in-JS solutions
- Relative paths (`../../../`)
- Types without `T` prefix
- Disordered imports
- Components without typing
- Global CSS (except in `shared/styles/`)
- `any` type (use `unknown` or proper types)
- Non-BEM class names (e.g., `.button-primary`, `.buttonIcon`)

## ✅ Always Use

**ALWAYS use:**
- CSS Modules with **BEM convention** (`block__element--modifier`)
- Path aliases (`@/shared/ui`)
- Types with `T` prefix
- Ordered imports according to ESLint
- Complete TypeScript typing
- FSD structure
- Named exports
- English for code, comments, and documentation

## 📝 Code Language

**IMPORTANT**: All code, comments, variable names, function names, and documentation in code files must be written in **English**. Only user-facing text (UI labels, error messages visible to users) can be in French.

## 🎨 Component Template

When creating a new component, use this template:

```typescript
'use client' // Only if needed (hooks, events)

import { useState } from 'react'

import NextLink from 'next/link'

import { Button } from '@/shared/ui'

import { TComponentProps } from './Component.types'

import styles from './Component.module.css'

export const Component = ({ 
  title, 
  onClose, 
  variant = 'primary' 
}: TComponentProps) => {
  const [state, setState] = useState<string>('')
  
  return (
    <div className={styles.component}>
      <h2 className={styles.component__title}>{title}</h2>
      <Button variant={variant} onClick={onClose}>
        Close
      </Button>
    </div>
  )
}
```

## 🔍 Reference Files

When in doubt, check these reference files:
- `src/shared/ui/Button/` - Basic UI component
- `src/features/CreateWishlist/` - Complete feature with model and UI
- `src/entities/wishlist/ui/WishlistForm.tsx` - Entity form
- `src/widgets/Header/Header.tsx` - Composite widget

