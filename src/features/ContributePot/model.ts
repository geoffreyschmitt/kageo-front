'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

import { contributePot } from '@/shared/api/wishlist/contributePot'
import { mockContributePot } from './lib/mockContributePot'

type TUseContributePotModelParams = {
    wishlistId: string
    onContribute?: (wishlistId: string, amount: number) => void
    onError?: (wishlistId: string, amount: number) => void
    onClose: () => void
    useMock?: boolean
}

export const useContributePotModel = ({
    wishlistId,
    onContribute,
    onError,
    onClose,
    useMock = false,
}: TUseContributePotModelParams) => {
    const t = useTranslations('contributeModal')
    const [amount, setAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = useCallback(async () => {
        const parsed = parseFloat(amount)
        if (!parsed || parsed <= 0) {
            setError(t('invalidAmount'))
            return
        }
        setError(null)
        setIsSubmitting(true)

        // Optimistic update — call before API so UI reflects immediately
        if (onContribute) onContribute(wishlistId, parsed)
        onClose()

        try {
            const runner = useMock ? mockContributePot : contributePot
            await runner(wishlistId, parsed)
            setAmount('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to contribute')
            if (onError) onError(wishlistId, parsed)
        } finally {
            setIsSubmitting(false)
        }
    }, [wishlistId, amount, onContribute, onError, onClose, useMock, t])

    return { amount, setAmount, isSubmitting, error, handleSubmit }
}
