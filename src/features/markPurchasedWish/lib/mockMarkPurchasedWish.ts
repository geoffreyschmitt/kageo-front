export type TMarkPurchasedWishResponse = {
    id: string
    status: 'purchased'
    purchasedBy: string
}

export const mockMarkPurchasedWish = async (
    wishId: string,
    userId: string
): Promise<TMarkPurchasedWishResponse> => {
    console.info("[mockMarkPurchasedWish] called with:", { wishId, userId })
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
        id: wishId,
        status: 'purchased',
        purchasedBy: userId,
    }
}
