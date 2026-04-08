export type TContributeModal = {
    isOpen: boolean
    onClose: () => void
    wishlistId: string
    eventName: string
    ownerName: string
    totalContributed: number
    userContributed?: number
    currency: string
    onContribute?: (wishlistId: string, amount: number) => void
    onError?: (wishlistId: string, amount: number) => void
    useMock?: boolean
}
