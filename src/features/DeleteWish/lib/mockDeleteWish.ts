export type TDeleteWishResponse = {
    id: string
    deleted: true
}

export const mockDeleteWish = async (
    wishId: string
): Promise<TDeleteWishResponse> => {
    console.info("[mockDeleteWish] called with:", { wishId })
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
        id: wishId,
        deleted: true,
    }
}
