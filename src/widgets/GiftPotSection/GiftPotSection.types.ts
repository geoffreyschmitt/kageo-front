import type { TWishStatus } from '@/entities/wish'
import type { TGiftPotView } from '@/shared/api/wish/getGiftPot'

export type TGiftPotSectionProps = {
    wishId: string
    price: number
    currency: string
    status: TWishStatus
    eventName: string
    ownerName: string
    isLoggedIn: boolean
    isInvited: boolean
    userId?: string
    /** null = no pot yet (the wish may still be eligible for one) */
    giftPot: TGiftPotView | null
    onGiftPotCreated: (wishId: string, creatorId: string, creatorName: string) => void
    onContributeGiftPot: (wishId: string, delta: number) => void
    onContributeGiftPotError: (wishId: string, delta: number) => void
    onGiftPotRemoved: (wishId: string, removedAmount: number) => void
    onGiftPotRefreshed: (wishId: string, view: TGiftPotView | null) => void
    onMarkPurchased?: (wishId: string, userId: string) => void
    onMarkPurchasedError?: (wishId: string) => void
    useMock?: boolean
}
