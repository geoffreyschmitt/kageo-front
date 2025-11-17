# TypeScript Conventions

## 🔷 Type Definitions

### Type Prefix

**All types and interfaces must use the `T` prefix:**

```typescript
// ✅ CORRECT
export type TButtonProps = { ... }
export type TWishlist = { ... }
export interface TComponentState { ... }

// ❌ INCORRECT
export type ButtonProps = { ... }
export interface Wishlist { ... }
```

### Type Files

- Create a separate `.types.ts` file for component types
- File name: `ComponentName.types.ts`
- Export all types from this file

### Example Structure

```typescript
// Button.types.ts
export type TButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'

export type TButtonAsButton = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: never
  className?: string
  variant?: TButtonVariant
}

export type TButtonAsLink = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  className?: string
  variant?: TButtonVariant
}

export type TButton = TButtonAsButton | TButtonAsLink
```

## 📦 Component Props Typing

```typescript
// Component.tsx
import { TComponentProps } from './Component.types'

export const Component = ({ 
  title, 
  onClose, 
  variant = 'primary' 
}: TComponentProps) => {
  // ...
}
```

## 🎣 Hook Typing

```typescript
// model.ts
type TUseFeatureModel = {
  onSubmit: (data: TFormData) => void
  onClose: () => void
  useMock?: boolean
}

export const useFeatureModel = ({
  onSubmit,
  onClose,
  useMock = false,
}: TUseFeatureModel) => {
  // ...
}
```

## ✅ Type Safety Rules

1. **Always type props**: Never use `any` for component props
2. **Type function parameters**: All function parameters must be typed
3. **Type return values**: Explicitly type function return values when not obvious
4. **Use type inference**: Let TypeScript infer types when obvious (e.g., `useState`)
5. **Avoid `any`**: Use `unknown` or proper types instead

## 📝 Current Configuration

- **Strict mode**: Enabled
- **noImplicitAny**: Currently `false` (TODO: remove this later)
- **Base URL**: `src` for absolute imports

