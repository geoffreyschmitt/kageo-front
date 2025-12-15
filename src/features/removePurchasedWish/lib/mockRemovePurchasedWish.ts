export type TRemovePurchasedWishResponse = {
    id: string
    status: 'wanted'
    purchasedBy: undefined
}

export const mockRemovePurchasedWish = async (
    wishId: string
): Promise<TRemovePurchasedWishResponse> => {
    console.info("[mockRemovePurchasedWish] called with:", { wishId })
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
        id: wishId,
        status: 'wanted',
        purchasedBy: undefined,
    }
}
