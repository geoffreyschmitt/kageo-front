# Code Patterns

## 🚌 Event Bus Pattern

For communication between non-directly related components, use the Event Bus.

### Import

```typescript
import { eventBus } from '@/shared/eventBus/lib/eventBus'
```

### Emit Events

```typescript
// Emit an event
eventBus.emit('wishlist:openCreationModal', {})
eventBus.emit('wishlist:closeCreationModal', {})
```

### Listen to Events

```typescript
useEffect(() => {
  const removeOpenModalEvent = eventBus.on('wishlist:openCreationModal', () => {
    setIsOpen(true)
  })
  
  const removeCloseModalEvent = eventBus.on('wishlist:closeCreationModal', () => {
    setIsOpen(false)
  })
  
  // Cleanup: remove listeners on unmount
  return () => {
    removeOpenModalEvent()
    removeCloseModalEvent()
  }
}, [])
```

### Event Naming Convention

Use format: `entity:action` (e.g., `wishlist:openCreationModal`, `wish:markAsPurchased`)

## 🎭 Mock Functions Pattern

For development, provide mock functions with a `useMock` flag.

### Structure

```typescript
// features/CreateWishlist/model.ts
import { createWishlist } from '@/services/wishlist/createWishlist'
import { mockCreateWishlist } from './lib/mockCreateWishlist'

export const useCreateWishlistModel = ({
  useMock = false,
  // ...
}: TUseCreateWishlistModel) => {
  const handleSubmit = useCallback(async () => {
    const runner = useMock ? mockCreateWishlist : createWishlist
    await runner(formData)
    // ...
  }, [formData, useMock])
}
```

### Mock File Location

Mocks should be in the `lib/` folder of the feature/entity:
- `features/CreateWishlist/lib/mockCreateWishlist.ts`
- `entities/wishlist/lib/mockWishlists.ts`

## ✅ Validation Pattern

Validation functions should be in the `lib/` folder of the concerned entity.

### Structure

```typescript
// entities/wishlist/lib/validateWishlistForm.ts
import type { TWishlistFormData, TWishlistValidationErrors } from '@/entities/wishlist'

export const validateWishlistForm = (
  formData: TWishlistFormData
): { errorList: TWishlistValidationErrors; hasError: boolean } => {
  const errorList: TWishlistValidationErrors = {}
  
  if (!formData.name?.trim()) {
    errorList.name = 'Name is required'
  }
  
  if (!formData.description?.trim()) {
    errorList.description = 'Description is required'
  }
  
  return {
    errorList,
    hasError: Object.keys(errorList).length > 0,
  }
}
```

### Usage

```typescript
const { errorList, hasError } = validateWishlistForm(formData)
if (hasError) {
  setErrors(errorList)
  return
}
```

## 🎣 Custom Hooks Pattern

Business logic should be extracted into custom hooks in `model.ts`.

### Structure

```typescript
// features/CreateWishlist/model.ts
type TUseCreateWishlistModel = {
  onSubmit: (wishlistData: TWishlistFormData) => void
  onClose: () => void
  useMock?: boolean
}

export const useCreateWishlistModel = ({
  onSubmit,
  onClose,
  useMock = false,
}: TUseCreateWishlistModel) => {
  const [formData, setFormData] = useState<TWishlistFormData>({...})
  const [errors, setErrors] = useState<TWishlistValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  
  const handleInputChange = useCallback((field, value) => {
    // ...
  }, [])
  
  const handleSubmit = useCallback(async () => {
    // ...
  }, [formData, onSubmit, onClose, useMock])
  
  return {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleSubmit,
  }
}
```

## 📤 Export Pattern

Always export from `index.ts` files to facilitate imports.

### Feature/Entity/Widget index.ts

```typescript
// features/CreateWishlist/index.ts
export * from './ui'
export { useCreateWishlistModel } from './model'
```

### UI Component index.ts

```typescript
// shared/ui/Button/index.ts
export { Button } from './Button'
export type { TButton, TButtonVariant } from './Button.types'
```

