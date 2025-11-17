# Import Organization

## 🎯 Path Aliases

**ALWAYS** use path aliases instead of relative paths.

### Available Aliases

- `@/*` → `src/*`
- `@/features/*` → `src/features/*`
- `@/shared/*` → `src/shared/*`
- `@/entities/*` → `src/entities/*`
- `@/widgets/*` → `src/widgets/*`
- `@/pages/*` → `src/pages/*`

### Examples

```typescript
// ✅ CORRECT
import { Button } from '@/shared/ui'
import { WishlistForm } from '@/entities/wishlist/ui'
import { useCreateWishlistModel } from '@/features/CreateWishlist'

// ❌ INCORRECT
import { Button } from '../../../shared/ui/Button'
import { WishlistForm } from '../../entities/wishlist/ui/WishlistForm'
```

## 📋 Import Order (ESLint Enforced)

The import order is **strictly** enforced by ESLint. Follow this order:

1. **Built-in** (Node.js natives)
2. **External** (react, next, next-auth, etc.)
3. **Internal** (by layer order):
   - `@/widgets/**`
   - `@/features/**`
   - `@/entities/**`
   - `@/shared/**`
4. **CSS Modules** (always last)
5. **Blank lines** between each group
6. **Alphabetical sorting** within each group

## ✅ Correct Import Example

```typescript
import { useState, useEffect } from 'react'

import NextLink from 'next/link'
import { signIn } from 'next-auth/react'

import { Button } from '@/shared/ui'
import { WishlistForm } from '@/entities/wishlist/ui'
import { useCreateWishlistModel } from '@/features/CreateWishlist'

import styles from './Component.module.css'
```

## 🔍 Import Best Practices

1. Use named exports from `index.ts` files when available
2. Group related imports together
3. Keep imports at the top of the file
4. Remove unused imports
5. Use path aliases for all internal imports

