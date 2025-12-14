import {TWishFormData} from "@/entities/wish";

export type TEditWishResponse = TWishFormData & {
    id: string
}

export const editWish = async (
    wishId: string,
    data: TWishFormData,
): Promise<TEditWishResponse> => {
    const res = await fetch(`/api/wish/${wishId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${text}`)
    }

    return (await res.json()) as TEditWishResponse
}
