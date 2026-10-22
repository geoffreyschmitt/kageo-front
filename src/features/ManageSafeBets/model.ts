'use client'

import { useCallback, useEffect, useState } from 'react'

import type { TSafeBet } from '@/entities/safeBet'

import {
    createSafeBet,
    deleteSafeBet,
    getSafeBets,
    reorderSafeBets,
    updateSafeBet,
    type TSafeBetPayload,
} from '@/shared/api/safeBet'

// Swaps an id with its neighbour; clamps at both ends; never mutates.
export const moveId = (ids: string[], id: string, dir: -1 | 1): string[] => {
    const next = [...ids]
    const from = next.indexOf(id)
    const to = from + dir
    if (from === -1 || to < 0 || to >= next.length) return next
    ;[next[from], next[to]] = [next[to], next[from]]
    return next
}

export const useManageSafeBetsModel = () => {
    const [entries, setEntries] = useState<TSafeBet[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        getSafeBets()
            .then((data) => {
                if (!cancelled) setEntries(data)
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    // Runs a mutation, surfaces the error and rethrows so forms can stay open.
    const run = useCallback(async (fn: () => Promise<void>) => {
        setError(null)
        try {
            await fn()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
            throw err
        }
    }, [])

    const add = useCallback(
        (input: TSafeBetPayload) =>
            run(async () => {
                const created = await createSafeBet(input)
                setEntries((prev) => [...prev, created])
            }),
        [run],
    )

    const update = useCallback(
        (id: string, input: TSafeBetPayload) =>
            run(async () => {
                const updated = await updateSafeBet(id, input)
                setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)))
            }),
        [run],
    )

    const remove = useCallback(
        (id: string) =>
            run(async () => {
                await deleteSafeBet(id)
                setEntries((prev) => prev.filter((e) => e.id !== id))
            }),
        [run],
    )

    const move = useCallback(
        (id: string, dir: -1 | 1) =>
            run(async () => {
                const ids = moveId(
                    entries.map((e) => e.id),
                    id,
                    dir,
                )
                setEntries(await reorderSafeBets(ids))
            }),
        [run, entries],
    )

    return { entries, isLoading, error, add, update, remove, move }
}
