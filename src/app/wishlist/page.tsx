'use client';
import { useMemo, useState } from "react";

import { WishlistList } from "@/widgets"

import { OwnerFilter } from "@/features/FilterWishlistOwner";
import { TWishlistOwner } from "@/features/FilterWishlistOwner/ui/FilterWishlistOwner.types";

import { mockUserPrivate } from "@/entities/user";
import { wishlistsMock } from "@/entities/wishlist";

import { Tabs } from "@/shared/ui"

import pageStyles from "./page.module.css"

export default function HomePage() {
    const user = mockUserPrivate
    const ownedWishlists = wishlistsMock.filter((w) => w.ownerId === user.id)
    const allInvitedWishlists = wishlistsMock.filter((w) => w.ownerId !== user.id)

    const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<TWishlistOwner | null>(null)


    const uniqueInvitedOwners = useMemo(() => {
        const owners = new Set<{ id: string, name: string }>()
        allInvitedWishlists.forEach((wishlist) => owners.add({id: wishlist.id, name: wishlist.ownerId}))
        return Array.from(owners).sort()
    }, [allInvitedWishlists])

    const filteredInvitedWishlists = useMemo(() => {
        if (!selectedOwnerFilter) {
            return allInvitedWishlists
        }
        return allInvitedWishlists.filter((wishlist) => wishlist.ownerId === selectedOwnerFilter.name)
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
                        <OwnerFilter
                            owners={uniqueInvitedOwners}
                            selectedOwner={selectedOwnerFilter?.name}
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
