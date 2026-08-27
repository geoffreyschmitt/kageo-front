'use client'

import { useCallback, useMemo, useState } from 'react'

import { getPot, type TGetPotResponse } from '@/shared/api/wishlist/getPot'

export const POT_DENSE_THRESHOLD = 8

type TSortBy = 'amount' | 'date' | 'name'

type TUsePotCardModelParams = {
    wishlistId: string
    pot: TGetPotResponse | null
    onPotRefreshed?: (view: TGetPotResponse | null) => void
    useMock: boolean
}

export const usePotCardModel = ({ wishlistId, pot, onPotRefreshed, useMock }: TUsePotCardModelParams) => {
    const [modal, setModal] = useState<'add' | 'edit' | null>(null)
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState<TSortBy>('amount')

    // Fetch the authoritative pot view after an action and hand it back to the
    // page. Optimistic values are already on screen, so this only reconciles —
    // no layout change unless the server genuinely differs.
    const reconcile = useCallback(async () => {
        if (useMock || !onPotRefreshed) return
        try {
            onPotRefreshed(await getPot(wishlistId))
        } catch {
            /* keep the optimistic view */
        }
    }, [wishlistId, useMock, onPotRefreshed])

    const contributors = pot?.contributors ?? []
    const isDense = contributors.length > POT_DENSE_THRESHOLD

    const visibleContributors = useMemo(() => {
        const q = search.trim().toLowerCase()
        const list = q ? contributors.filter((c) => c.name.toLowerCase().includes(q)) : contributors
        return [...list].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name)
            if (sortBy === 'date') return (b.lastContributedAt ?? '').localeCompare(a.lastContributedAt ?? '')
            return b.amount - a.amount
        })
    }, [contributors, search, sortBy])

    return {
        isDense,
        modal,
        openAdd: () => setModal('add'),
        openEdit: () => setModal('edit'),
        closeModal: () => setModal(null),
        search,
        setSearch,
        sortBy,
        setSortBy,
        visibleContributors,
        reconcile,
    }
}
