import {TProposedWishFormData, TWishFormData} from "@/entities/wish";

export type TAddWishResponse<T extends TWishFormData | TProposedWishFormData> = T & {
    id: string
}

export const addWish = async <T extends TWishFormData | TProposedWishFormData>(
    data: T
): Promise<TAddWishResponse<T>> => {
    const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TAddWishResponse<T>
}