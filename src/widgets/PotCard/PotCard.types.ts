export type TPotCardProps = {
    wishlistId: string
    /** wishlist name — shown as the contribute modal subtitle */
    eventName: string
    ownerName: string
    currency: string
    isLoggedIn: boolean
    isInvited: boolean
    /** null when no pot has been started for this wishlist yet */
    potCreatorName: string | null
    totalContributed: number
    userContributed: number
    onContribute?: (wishlistId: string, amount: number) => void
    onContributeError?: (wishlistId: string, amount: number) => void
    onPotCreated?: (creatorId: string, creatorName: string) => void
    /** called when a logged-out visitor tries to contribute */
    onRequireLogin?: () => void
    useMock?: boolean
}
