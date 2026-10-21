import {TWishlistFormData} from "@/entities/wishlist";

import { assertOk } from "../assertOk"

export type TCreateWishlistResponse = TWishlistFormData & { id: string }

export const createWishlist = async (data: TWishlistFormData): Promise<TCreateWishlistResponse> => {
    const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    })

    await assertOk(res)

    const json = (await res.json()) as TCreateWishlistResponse
    return json
}
