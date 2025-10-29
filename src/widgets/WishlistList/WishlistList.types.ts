import {TWishlistCard} from "@/widgets/WishlistCard";

export type TWishlistList = {
    wishlistCardList: TWishlistCard[]
    title?: string
    emptyMessage?: string
    showCreateButton?: boolean
}
