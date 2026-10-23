'use client'

import { useEffect, useRef } from 'react'

import { WishCard } from '@/widgets/WishCard'

import type { TGiftPotView } from '@/shared/api/wish/getGiftPot'

import styles from './page.module.css'

export type TMockVariant = 'reserved' | 'owner' | 'pot-out' | 'pot-in' | 'wanted'

type TMockWishProps = {
    variant: TMockVariant
    name: string
    price: number
    addedDate: string
    /** Display name of whoever reserved the wish, as the real list shows it to everyone but the owner. */
    reservedByName?: string
}

const noop = () => {}

const POT_GOAL = 500

// A pot as the API shapes it for someone who is not the organiser: totals and a head count, no names.
const samplePot = (): TGiftPotView => ({
    creatorName: 'Fay',
    goal: POT_GOAL,
    totalContributed: 310,
    isFunded: false,
    myContribution: 0,
    participantCount: 6,
})

/**
 * The real WishCard (and, through it, the real GiftPotSection) fed static sample data, the way
 * the shared-list page feeds it. It is a picture of the product, not a control: the wrapper is
 * inert so nothing in it can be focused or clicked, and it is hidden from assistive tech. Each
 * place that uses it carries the same information as text next to it.
 */
export const MockWish = ({ variant, name, price, addedDate, reservedByName }: TMockWishProps) => {
    const ref = useRef<HTMLDivElement>(null)
    const isOwner = variant === 'owner'
    const isLoggedIn = variant === 'pot-in'
    const status = variant === 'reserved' ? 'reserved' : 'wanted'

    // The pot opens from a collapsed <details>; the landing shows it open so the panel is visible.
    useEffect(() => {
        if (variant === 'pot-in') ref.current?.querySelector('details')?.setAttribute('open', '')
    }, [variant])

    // Only the two pot variants carry a pot. Leaving it undefined keeps the real card from drawing
    // its "open a pot" prompt, which the landing page does not offer as a plain feature.
    const giftPot: TGiftPotView | undefined = variant === 'pot-out' || variant === 'pot-in' ? samplePot() : undefined

    return (
        <div ref={ref} className={styles.mock} inert aria-hidden="true">
            <WishCard
                id={`demo-${variant}`}
                name={name}
                description=""
                price={price}
                currency="€"
                imageUrl=""
                priority="medium"
                status={status}
                addedDate={addedDate}
                commentCount={0}
                reservedBy={variant === 'reserved' ? 'demo-reserver' : undefined}
                reservedByName={reservedByName}
                showOwnerAction={isOwner}
                showGuestAction={!isOwner}
                isOwner={isOwner}
                isLoggedIn={isLoggedIn}
                isInvited={isLoggedIn}
                userId={isLoggedIn ? 'demo-guest' : undefined}
                onRequireLogin={isLoggedIn ? undefined : noop}
                giftPot={giftPot}
                eventName=""
                ownerName="Julie"
            />
        </div>
    )
}
