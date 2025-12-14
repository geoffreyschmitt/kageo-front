export type TDeleteWishButton = {
    wishId: string
    wishName?: string
    onDelete?: (wishId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}
