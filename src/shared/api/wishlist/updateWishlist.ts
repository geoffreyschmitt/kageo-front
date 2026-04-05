import {TWishlistFormData} from "@/entities/wishlist";

export type TUpdateWishlistResponse = TWishlistFormData & { id: string }

export const updateWishlist = async (data: TWishlistFormData & { id: string }): Promise<TUpdateWishlistResponse> => {
    const res = await fetch(`/api/wishlist/${data.id}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${text}`)
    }

    const json = (await res.json()) as TUpdateWishlistResponse
    return json
}
