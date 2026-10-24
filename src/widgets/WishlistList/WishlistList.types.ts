import {TWishlistCard} from "@/widgets/WishlistCard";

export type TWishlistList = {
    wishlistCardList: TWishlistCard[]
    currentUserId: string
    title?: string
    emptyMessage?: string
    showCreateButton?: boolean
    isHistory?: boolean
    /** Skip the title/count/create row when the page already provides its own header. */
    hideHeader?: boolean
    hideOwner?: boolean
}
