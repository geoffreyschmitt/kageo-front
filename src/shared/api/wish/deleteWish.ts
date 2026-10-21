import { assertOk } from "../assertOk"

export type TDeleteWishResponse = {
    id: string
    deleted: true
}

export const deleteWish = async (
    wishId: string
): Promise<TDeleteWishResponse> => {
    const res = await fetch("/api/wish/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishId }),
    })

    await assertOk(res)

    return (await res.json()) as TDeleteWishResponse
}
