export type TReserveWishResponse = {
    id: string
    status: 'reserved'
    reservedBy: string
}

export const mockReserveWish = async (
    wishId: string,
    userId: string
): Promise<TReserveWishResponse> => {
    console.info("[mockReserveWish] called with:", { wishId, userId })
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
        id: wishId,
        status: 'reserved',
        reservedBy: userId,
    }
}



