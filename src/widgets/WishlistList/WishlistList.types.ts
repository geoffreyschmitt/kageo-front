import {TWishlistCard} from "@/widgets/WishlistCard";

export type TWishlistList = {
    wishlistCardList: TWishlistCard[]
    currentUserId: string
    title?: string
    emptyMessage?: string
    showCreateButton?: boolean
    isHistory?: boolean
}
