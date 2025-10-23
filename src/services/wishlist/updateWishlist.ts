import {TEditWishlistFormData} from "@/entities/wishlist";

export type TAddWishResponse = TEditWishlistFormData & { id: string }

export const updateWishlist = async (data: TEditWishlistFormData): Promise<TAddWishResponse> => {
    const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${text}`)
    }

    const json = (await res.json()) as TAddWishResponse
    return json
}