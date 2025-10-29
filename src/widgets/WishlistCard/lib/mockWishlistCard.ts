import {TWishlistCard} from "@/widgets/WishlistCard";

export const wishlistCardMock: TWishlistCard = {
    id: "1",
    name: "Birthday Wishlist 2024",
    description: "All the things I'm hoping to get for my birthday this year. From books to gadgets!",
    coverImage: "/placeholder.svg?height=200&width=300",
    createdAt: new Date('2023-08-15'),
    isPublic: true,
    ownerId: "u123",
    ownerName: "Geoffrey S.",
    itemCount: 5
}