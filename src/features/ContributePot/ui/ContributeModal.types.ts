export type TContributeModal = {
    isOpen: boolean
    onClose: () => void
    wishlistId: string
    eventName: string
    ownerName: string
    creatorName: string
    totalContributed: number
    userContributed?: number
    currency: string
    isLoggedIn: boolean
    onContribute?: (wishlistId: string, amount: number) => void
    onError?: (wishlistId: string, amount: number) => void
    useMock?: boolean
}
