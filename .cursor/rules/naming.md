# Naming Conventions

## 📝 File and Component Naming

### React Components
- **Format**: PascalCase
- **Example**: `CreateWishlistModal.tsx`, `WishCard.tsx`
- **Location**: In `ui/` folder of the feature/entity/widget

### Type/Interface Files
- **Format**: `ComponentName.types.ts`
- **Example**: `Button.types.ts`, `WishlistForm.types.ts`
- **Location**: Same folder as the component

### CSS Module Files
- **Format**: `ComponentName.module.css`
- **Example**: `Button.module.css`, `WishlistForm.module.css`
- **Location**: Same folder as the component

### Custom Hooks
- **Format**: `use` prefix + PascalCase
- **Example**: `useCreateWishlistModel`, `useMobile`
- **Location**: In `model.ts` for features, or `hooks/` for shared hooks

### Utility Functions
- **Format**: camelCase
- **Example**: `validateWishlistForm.ts`, `mockCreateWishlist.ts`
- **Location**: In `lib/` folder

### Type/Interface Names
- **Format**: `T` prefix + PascalCase
- **Example**: `TButton`, `TWishlist`, `TButtonVariant`, `TUseCreateWishlistModel`
- **Rule**: All types and interfaces must use the `T` prefix

## 📂 Folder Naming

- **Features/Entities/Widgets**: PascalCase (`CreateWishlist`, `WishCard`)
- **Shared utilities**: camelCase (`eventBus`, `isValidUrl`)
- **Folders**: lowercase with hyphens if needed (`use-mobile.tsx`)

## ✅ Examples

```
✅ Correct:
- CreateWishlistModal.tsx
- TButtonProps
- useCreateWishlistModel
- validateWishlistForm.ts
- Button.module.css

❌ Incorrect:
- createWishlistModal.tsx (should be PascalCase)
- ButtonProps (should have T prefix)
- CreateWishlistModel (should have use prefix)
- ValidateWishlistForm.ts (should be camelCase)
- button.module.css (should match component name)
```

