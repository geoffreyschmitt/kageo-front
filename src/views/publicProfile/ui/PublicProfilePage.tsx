'use client'

import { useLocale, useTranslations } from 'next-intl'
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

function formatMemberSince(iso: string, locale: string): string {
    return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export default function PublicProfilePage({ name, createdAt, wishlists, currentUserId }: TPublicProfilePageProps) {
    const t = useTranslations('publicProfile')
    const tProfile = useTranslations('profile')
    const locale = useLocale()

    return (
        <main className={s.publicProfile}>
            <div className={s.hero}>
                <div className={s.hero__inner}>
                    <div className={s.avatar}>
                        <span className={s.avatar__monogram}>{getInitials(name)}</span>
                    </div>
                    <h1 className={s.hero__name}>{name}</h1>
                    <span className={s.hero__badge}>{tProfile('memberSince', { date: formatMemberSince(createdAt, locale) })}</span>
                </div>
            </div>

            <div className={s.body}>
                <WishlistList
                    wishlistCardList={wishlists}
                    currentUserId={currentUserId}
                    title={t('publicWishlistsTitle')}
                    emptyMessage={t('emptyMessage', { name })}
                    showCreateButton={false}
                />
            </div>
        </main>
    )
}
