import type { TGetPotResponse } from '@/shared/api/wishlist/getPot'

export type TPotCardProps = {
    wishlistId: string
    /** wishlist name — shown as the contribute modal subtitle */
    eventName: string
    ownerName: string
    currency: string
    isLoggedIn: boolean
    isInvited: boolean
    /**
     * The pot view for the current viewer, or null when no pot has been started.
     * Server-rendered on first paint and kept in sync by the page: optimistic
     * updates land here immediately, a background reconcile replaces it.
     */
    pot: TGetPotResponse | null
    onContribute?: (wishlistId: string, delta: number) => void
    onContributeError?: (wishlistId: string, delta: number) => void
    onContributeRemoved?: (wishlistId: string, removedAmount: number) => void
    onPotCreated?: (creatorId: string, creatorName: string) => void
    /** replace the pot view with a freshly fetched one */
    onPotRefreshed?: (view: TGetPotResponse | null) => void
    /** called when a logged-out visitor tries to contribute */
    onRequireLogin?: () => void
    useMock?: boolean
}
