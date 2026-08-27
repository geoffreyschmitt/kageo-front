import type {
    TWishlistContributeResponse,
    TWishlistSetContributionResponse,
} from '@/shared/api/wishlist/contributePot'

export const mockContributePot = async (
    wishlistId: string,
    amount: number,
): Promise<TWishlistContributeResponse> => {
    await new Promise(resolve => setTimeout(resolve, 450))
    return {
        wishlistId,
        contribution: {
            userId: 'mock-user',
            amount,
            contributedAt: new Date().toISOString(),
        },
        totalContributed: amount,
    }
}

export const mockSetContribution = async (
    wishlistId: string,
    amount: number,
): Promise<TWishlistSetContributionResponse> => {
    await new Promise(resolve => setTimeout(resolve, 450))
    return { wishlistId, totalContributed: amount, myContribution: amount }
}
