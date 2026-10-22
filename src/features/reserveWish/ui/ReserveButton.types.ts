export type TReserveButton = {
    wishId: string
    userId: string
    onReserve?: (wishId: string, reservedBy: string) => void
    onError?: (wishId: string) => void
    // Signed-out guests: tapping asks them to log in instead of reserving.
    onRequireLogin?: () => void
}

