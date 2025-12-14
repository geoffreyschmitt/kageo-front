import {TWishFormData} from "@/entities/wish";

export type TEditWishResponse = TWishFormData & { id: string }

export const mockEditWish = async (
    wishId: string,
    data: TWishFormData,
): Promise<TEditWishResponse> => {
    console.info("[mockEditWish] called with wishId:", wishId, "data:", data)
    await new Promise(resolve => setTimeout(resolve, 600))
    return { ...data, id: wishId }
}
