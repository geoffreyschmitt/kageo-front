import type { TWishCard } from '@/widgets/WishCard'

import { sortByStoredOrder } from '@/shared/lib/wishOrder'

// "Most wanted" is high priority and still to be bought; everything else (including a
// purchased high-priority wish) is in the regular list. Both follow the owner's stored order.
export const isMostWanted = (item: Pick<TWishCard, 'priority' | 'status'>) =>
    item.priority === 'high' && item.status !== 'purchased'

export const partitionWishes = (items: TWishCard[], order: string[]) => {
    const ordered = sortByStoredOrder(items, order)
    return {
        mostWanted: ordered.filter(isMostWanted),
        regular: ordered.filter((item) => !isMostWanted(item)),
    }
}
