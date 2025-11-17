# Architecture: Feature-Sliced Design (FSD)

## 🏗️ Project Structure

The project follows **Feature-Sliced Design** architecture with clear layer separation:

```
src/
├── app/              # Next.js pages (App Router) - routes and layouts
├── pages/            # Alternative pages (if needed)
├── widgets/          # Reusable composite components (Header, WishCard, etc.)
├── features/         # Isolated business features (CreateWishlist, AddWish, etc.)
├── entities/         # Business entities (user, wish, wishlist)
├── shared/           # Shared code (UI, hooks, utils, providers, styles)
└── services/         # API services and backend calls
```

## 📊 Layer Import Rules

- Upper layers can import from lower layers
- **app** → can import from all layers
- **widgets** → can import from features, entities, shared
- **features** → can import from entities, shared
- **entities** → can import from shared only
- **shared** → should only import external dependencies

**Never create circular dependencies between layers.**

## 📁 Feature/Entity/Widget Structure

Each feature, entity, or widget should follow this structure:

```
FeatureName/
├── index.ts              # Public exports only
├── model.ts              # Business logic, hooks, state management (for features)
├── ui/                   # UI components
│   ├── ComponentName.tsx
│   ├── ComponentName.types.ts
│   ├── ComponentName.module.css
│   └── index.ts
└── lib/                  # Specific utilities, mocks
    └── utilityFunction.ts
```

### Layer Responsibilities

- **app/**: Next.js routing, page layouts, API routes
- **widgets/**: Complex UI compositions that combine multiple features/entities
- **features/**: Complete user interactions with business logic
- **entities/**: Business domain models and their UI representations
- **shared/**: Reusable utilities, UI primitives, hooks, providers
- **services/**: API calls and external service integrations

## 🔍 Reference Examples

- `src/shared/ui/Button/` - Basic UI component (shared layer)
- `src/features/CreateWishlist/` - Complete feature with model and UI
- `src/entities/wishlist/ui/WishlistForm.tsx` - Entity form component
- `src/widgets/Header/Header.tsx` - Composite widget

