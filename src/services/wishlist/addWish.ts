 import type { TAddWishFormData } from "@/features/AddWish/ui/AddWishModal.types"

export type TAddWishResponse = TAddWishFormData & { id: string }

export const addWish = async (data: TAddWishFormData): Promise<TAddWishResponse> => {
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