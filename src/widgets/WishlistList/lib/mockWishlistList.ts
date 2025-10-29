import {TWishlistCard} from "@/widgets/WishlistCard";

export const wishlistCardListMock: TWishlistCard[] = [
    {
        id: "1",
        name: "Birthday Wishlist 2024",
        description: "All the things I'm hoping to get for my birthday this year. From books to gadgets!",
        coverImage: "/placeholder.svg?height=200&width=300",
        createdAt: new Date('2023-08-15'),
        isPublic: true,
        ownerId: "u123",
        ownerName: "Geoffrey S.",
        itemCount: 5
    },
    {
        id: "2",
        name: "Home Decor Dreams",
        description: "Beautiful pieces to make our house feel more like home. Focusing on cozy and modern vibes.",
        coverImage: "/placeholder.svg?height=200&width=300",
        createdAt: new Date('2025-10-05'),
        isPublic: false,
        ownerId: "u123",
        ownerName: "Geoffrey S.",
        itemCount: 12
    },
    {
        id: "3",
        name: "Tech Gadgets",
        description: "Latest tech gadgets and accessories that caught my eye. Perfect for productivity and fun!",
        coverImage: "/placeholder.svg?height=200&width=300",
        createdAt: new Date('2024-01-02'),
        isPublic: true,
        ownerId: "3",
        ownerName: "John D.",
        itemCount: 8
    },
    {
        id: "4",
        name: "Books to Read",
        description: "A curated list of books I want to read this year. Mix of fiction, non-fiction, and self-help.",
        coverImage: "/placeholder.svg?height=200&width=300",
        createdAt: new Date('2023-09-22'),
        isPublic: false,
        ownerId: "1",
        ownerName: "Alice M.",
        itemCount: 15
    },
    {
        id: "5",
        name: "Fashion Finds",
        description: "Stylish clothing and accessories for the upcoming season. Casual and formal wear included.",
        coverImage: "/placeholder.svg?height=200&width=300",
        createdAt: new Date('2023-12-10'),
        isPublic: true,
        ownerId: "4",
        ownerName: "Sarah P.",
        itemCount: 20
    },
    {
        id: "6",
        name: "Gaming Setup",
        description: "Upgrading my gaming rig with new peripherals and accessories.",
        coverImage: "/placeholder.svg?height=200&width=300",
        createdAt: new Date('2023-10-15'),
        isPublic: true,
        ownerId: "3",
        ownerName: "John D.",
        itemCount: 6
    },
    {
        id: "7",
        name: "Travel Essentials",
        description: "Gear for my next adventure, focusing on lightweight and durable items.",
        coverImage: "/placeholder.svg?height=200&width=300",
        createdAt: new Date('2025-01-15'),
        isPublic: false,
        ownerId: "5",
        ownerName: "Mike R.",
        itemCount: 10
    },
]