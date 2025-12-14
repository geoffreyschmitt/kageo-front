export type TReserveButton = {
    wishId: string
    userId: string
    onReserve?: (wishId: string, reservedBy: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}

