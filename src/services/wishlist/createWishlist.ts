import {TWishlistFormData} from "@/entities/wishlist";

export type TCreateWishlistResponse = TWishlistFormData

export const createWishlist = async (data: TWishlistFormData): Promise<TCreateWishlistResponse> => {
    const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${text}`)
    }

    const json = (await res.json()) as TCreateWishlistResponse
    return json
}