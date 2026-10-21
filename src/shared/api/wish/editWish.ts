import {TWishFormData} from "@/entities/wish";

import { assertOk } from "../assertOk"

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

    await assertOk(res)

    return (await res.json()) as TEditWishResponse
}
