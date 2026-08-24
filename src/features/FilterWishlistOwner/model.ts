type TUseFilterWishlistOwnerParams = {
    owners: { id: string, name: string }[]
    search?: string | null
}

export const useFilterWishlistOwner = ({owners, search = ''}: TUseFilterWishlistOwnerParams) => {
    const filteredOwners = owners.filter(o => o.name.toLowerCase().includes(search?.toLowerCase() ?? ''))

    return {
        filteredOwners,
    }
}