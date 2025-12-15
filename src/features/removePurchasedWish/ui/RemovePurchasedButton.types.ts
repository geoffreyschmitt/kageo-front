export type TRemovePurchasedButton = {
    wishId: string
    onRemovePurchased?: (wishId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}
