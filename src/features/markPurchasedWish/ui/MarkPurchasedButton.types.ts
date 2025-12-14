export type TMarkPurchasedButton = {
    wishId: string
    onMarkPurchased?: (wishId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}
