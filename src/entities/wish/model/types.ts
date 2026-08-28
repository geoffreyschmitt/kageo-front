export type TWishPriority = 'low' | 'medium' | 'high'

export type TWishStatus = 'wanted' | 'purchased' | 'reserved' | 'proposed' | 'funded'

export type TContribution = {
    userId: string
    amount: number
    contributedAt: string
}