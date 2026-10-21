import {TWishlistFormData} from "@/entities/wishlist";

import { assertOk } from "../assertOk"

export type TUpdateWishlistResponse = TWishlistFormData & { id: string }

export const updateWishlist = async (data: TWishlistFormData & { id: string }): Promise<TUpdateWishlistResponse> => {
    const res = await fetch(`/api/wishlist/${data.id}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    })

    await assertOk(res)

    const json = (await res.json()) as TUpdateWishlistResponse
    return json
}
