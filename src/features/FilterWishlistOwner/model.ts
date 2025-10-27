import { useState } from "react"

type TUseFilterWishlistOwnerParams = {
    owners: { id: string, name: string }[]
    search?: string | null
}

export const useFilterWishlistOwner = ({owners, search= ''}: TUseFilterWishlistOwnerParams) => {
    const [selectedOwner, setSelectedOwner] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    const filteredOwners = owners.filter(o => o.name.toLowerCase().includes(search?.toLowerCase() ?? '')) ?? [];

    const handleSelectOwner = (owner: string | null) => {
        setSelectedOwner(owner)
        if (owner) setSearchTerm(owner)
        else setSearchTerm("")
    }


    return {
        selectedOwner,
        searchTerm,
        filteredOwners,
        setSearchTerm,
        handleSelectOwner,
    }
}