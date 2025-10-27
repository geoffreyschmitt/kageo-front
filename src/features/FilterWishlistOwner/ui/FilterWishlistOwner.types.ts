export type TWishlistOwner = { id: string, name: string }
export type TFilterWishlistOwner = {
    owners: TWishlistOwner[]
    selectedOwner?: string | null
    onSelectOwner: (owner: TWishlistOwner | null) => void
}