'use client';
import { WishlistList } from "@/widgets"
import { Tabs } from "@/shared/ui"
import pageStyles from "./page.module.css"
import OwnerFilterSelect from "@/components/owner-filter-select"
import {useMemo, useState} from "react";

// Sample data for demonstration
const sampleWishlists = [
    {
        id: "1",
        name: "Birthday Wishlist 2024",
        description: "All the things I'm hoping to get for my birthday this year. From books to gadgets!",
        itemCount: 12,
        coverImage: "/placeholder.svg?height=200&width=300",
        createdDate: "2 weeks ago",
        isPublic: true,
        type: "owned", // Added type for categorization
        ownerName: "You", // Added ownerName
    },
    {
        id: "2",
        name: "Home Decor Dreams",
        description: "Beautiful pieces to make our house feel more like home. Focusing on cozy and modern vibes.",
        itemCount: 8,
        coverImage: "/placeholder.svg?height=200&width=300",
        createdDate: "1 month ago",
        isPublic: false,
        type: "owned", // Added type for categorization
        ownerName: "You", // Added ownerName
    },
    {
        id: "3",
        name: "Tech Gadgets",
        description: "Latest tech gadgets and accessories that caught my eye. Perfect for productivity and fun!",
        itemCount: 15,
        coverImage: "/placeholder.svg?height=200&width=300",
        createdDate: "3 days ago",
        isPublic: true,
        type: "invited", // Added type for categorization
        ownerName: "Mike Chen", // Added ownerName
    },
    {
        id: "4",
        name: "Books to Read",
        description: "A curated list of books I want to read this year. Mix of fiction, non-fiction, and self-help.",
        itemCount: 23,
        coverImage: "/placeholder.svg?height=200&width=300",
        createdDate: "1 week ago",
        isPublic: false,
        type: "owned", // Added type for categorization
        ownerName: "You", // Added ownerName
    },
    {
        id: "5",
        name: "Fashion Finds",
        description: "Stylish clothing and accessories for the upcoming season. Casual and formal wear included.",
        itemCount: 7,
        coverImage: "/placeholder.svg?height=200&width=300",
        createdDate: "5 days ago",
        isPublic: true,
        type: "invited", // Added type for categorization
        ownerName: "Emma Wilson", // Added ownerName
    },
    {
        id: "6",
        name: "Gaming Setup",
        description: "Upgrading my gaming rig with new peripherals and accessories.",
        itemCount: 10,
        coverImage: "/placeholder.svg?height=200&width=300",
        createdDate: "2 days ago",
        isPublic: true,
        type: "invited",
        ownerName: "Mike Chen",
    },
    {
        id: "7",
        name: "Travel Essentials",
        description: "Gear for my next adventure, focusing on lightweight and durable items.",
        itemCount: 5,
        coverImage: "/placeholder.svg?height=200&width=300",
        createdDate: "4 days ago",
        isPublic: false,
        type: "invited",
        ownerName: "David Lee",
    },
]

export default function HomePage() {
    const ownedWishlists = sampleWishlists.filter((w) => w.type === "owned")
    const allInvitedWishlists = sampleWishlists.filter((w) => w.type === "invited")

    const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string | null>(null)


    const uniqueInvitedOwners = useMemo(() => {
        const owners = new Set<string>()
        allInvitedWishlists.forEach((wishlist) => owners.add(wishlist.ownerName))
        return Array.from(owners).sort()
    }, [allInvitedWishlists])

    const filteredInvitedWishlists = useMemo(() => {
        if (!selectedOwnerFilter) {
            return allInvitedWishlists
        }
        return allInvitedWishlists.filter((wishlist) => wishlist.ownerName === selectedOwnerFilter)
    }, [allInvitedWishlists, selectedOwnerFilter])


    // Define the tabs for the Tabs component
    const tabs = [
        {
            label: "My Wishlists",
            content: (
                <WishlistList
                    wishlists={ownedWishlists}
                    title="My Wishlists"
                    emptyMessage="You haven't created any wishlists yet. Start by creating one!"
                    showCreateButton={true} // Show create button for owned wishlists
                />
            ),
        },
        {
            label: "Shared with Me",
            content: (
                <>
                    <div className={pageStyles.filterContainer}>
                        <OwnerFilterSelect
                            owners={uniqueInvitedOwners}
                            selectedOwner={selectedOwnerFilter}
                            onSelectOwner={setSelectedOwnerFilter}
                        />
                    </div>
                    <WishlistList
                        wishlists={filteredInvitedWishlists}
                        title="Wishlists Shared with Me"
                        emptyMessage="No wishlists have been shared with you yet."
                        showCreateButton={false}
                    />
                </>
            ),
        },
    ]

    return (
        <main className={pageStyles.pageLayout}>
            <Tabs tabs={tabs}/>
        </main>
    )
}
