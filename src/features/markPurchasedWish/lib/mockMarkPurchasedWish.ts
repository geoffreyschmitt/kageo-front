export type TMarkPurchasedWishResponse = {
    id: string
    status: 'purchased'
}

export const mockMarkPurchasedWish = async (
    wishId: string
): Promise<TMarkPurchasedWishResponse> => {
    console.info("[mockMarkPurchasedWish] called with:", { wishId })
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
        id: wishId,
        status: 'purchased',
    }
}
