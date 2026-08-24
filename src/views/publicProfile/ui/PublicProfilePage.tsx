'use client'

import { WishlistList } from '@/widgets'
import { TWishlistCard } from '@/widgets/WishlistCard'

import s from './publicProfile.module.css'

type TPublicProfilePageProps = {
    name: string
    createdAt: string
    wishlists: TWishlistCard[]
    currentUserId: string
}

function getInitials(name: string): string {
    if (!name) return '?'
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

function formatMemberSince(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function PublicProfilePage({ name, createdAt, wishlists, currentUserId }: TPublicProfilePageProps) {
    return (
        <main className={s.publicProfile}>
            <div className={s.hero}>
                <div className={s.hero__inner}>
                    <div className={s.avatar}>
                        <span className={s.avatar__monogram}>{getInitials(name)}</span>
                    </div>
                    <h1 className={s.hero__name}>{name}</h1>
                    <span className={s.hero__badge}>Member since {formatMemberSince(createdAt)}</span>
                </div>
            </div>

            <div className={s.body}>
                <WishlistList
                    wishlistCardList={wishlists}
                    currentUserId={currentUserId}
                    title="Public Wishlists"
                    emptyMessage={`${name} hasn't shared any public wishlists yet.`}
                    showCreateButton={false}
                />
            </div>
        </main>
    )
}
