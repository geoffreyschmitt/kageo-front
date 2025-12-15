export type TMarkPurchasedButton = {
    wishId: string
    userId: string
    onMarkPurchased?: (wishId: string, userId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}
