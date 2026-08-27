'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { getPot, type TGetPotResponse } from '@/shared/api/wishlist/getPot'

export const POT_DENSE_THRESHOLD = 8

type TSortBy = 'amount' | 'date' | 'name'

type TUsePotCardModelParams = {
    wishlistId: string
    potCreatorName: string | null
    totalContributed: number
    userContributed: number
    useMock: boolean
}

const buildMockDetail = (
    creatorName: string,
    totalContributed: number,
    userContributed: number,
): TGetPotResponse => ({
    creatorId: 'mock-creator-id',
    creatorName,
    isCreator: creatorName === 'You' || creatorName === 'Vous',
    totalContributed,
    myContribution: userContributed,
    participantCount: userContributed > 0 ? 3 : 2,
    contributors:
        creatorName === 'You' || creatorName === 'Vous'
            ? [
                  { name: creatorName, amount: userContributed || 20, lastContributedAt: new Date().toISOString() },
                  { name: 'Julien Lefebvre', amount: 50, lastContributedAt: '2026-08-16T10:00:00.000Z' },
                  { name: 'Aïcha Benali', amount: 40, lastContributedAt: '2026-08-22T10:00:00.000Z' },
              ]
            : undefined,
})

export const usePotCardModel = ({
    wishlistId,
    potCreatorName,
    totalContributed,
    userContributed,
    useMock,
}: TUsePotCardModelParams) => {
    const [detail, setDetail] = useState<TGetPotResponse | null>(null)
    const [loading, setLoading] = useState<boolean>(!!potCreatorName)
    const [refreshKey, setRefreshKey] = useState(0)
    const [modal, setModal] = useState<'add' | 'edit' | null>(null)
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState<TSortBy>('amount')

    const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

    useEffect(() => {
        if (!potCreatorName) {
            setDetail(null)
            setLoading(false)
            return
        }

        let cancelled = false
        setLoading(true)

        const run = async () => {
            try {
                if (useMock) {
                    await new Promise((r) => setTimeout(r, 250))
                    if (!cancelled) setDetail(buildMockDetail(potCreatorName, totalContributed, userContributed))
                } else {
                    const res = await getPot(wishlistId)
                    if (!cancelled) setDetail(res)
                }
            } catch {
                if (!cancelled) setDetail(null)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        run()
        return () => {
            cancelled = true
        }
        // totalContributed/userContributed feed only the mock path; refreshKey
        // forces a re-read after a pledge changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wishlistId, potCreatorName, useMock, refreshKey])

    const contributors = detail?.contributors ?? []
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
        detail,
        loading,
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
        refresh,
    }
}
