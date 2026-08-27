'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

import { contributePot, setContribution } from '@/shared/api/wishlist/contributePot'
import { mockContributePot, mockSetContribution } from './lib/mockContributePot'

type TUseContributePotModelParams = {
    wishlistId: string
    onContribute?: (wishlistId: string, amount: number) => void
    onError?: (wishlistId: string, amount: number) => void
    onRemove?: (wishlistId: string, removedAmount: number) => void
    onClose: () => void
    useMock?: boolean
    mode?: 'add' | 'edit'
    initialAmount?: number
}

export const useContributePotModel = ({
    wishlistId,
    onContribute,
    onError,
    onRemove,
    onClose,
    useMock = false,
    mode = 'add',
    initialAmount = 0,
}: TUseContributePotModelParams) => {
    const t = useTranslations('contributeModal')
    const [amount, setAmount] = useState(mode === 'edit' && initialAmount > 0 ? String(initialAmount) : '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isEdit = mode === 'edit'

    const handleSubmit = useCallback(async () => {
        const parsed = parseFloat(amount)
        // In edit mode 0 is allowed — it cancels the pledge.
        if (Number.isNaN(parsed) || parsed < 0 || (parsed <= 0 && !isEdit)) {
            setError(t('invalidAmount'))
            return
        }
        setError(null)
        setIsSubmitting(true)

        // `onContribute`/`onError` operate on a delta so the page-level totals
        // stay correct whether we're adding or replacing a pledge.
        const delta = isEdit ? parsed - initialAmount : parsed

        // Optimistic update — call before API so UI reflects immediately
        if (onContribute) onContribute(wishlistId, delta)
        onClose()

        try {
            if (isEdit) {
                const runner = useMock ? mockSetContribution : setContribution
                await runner(wishlistId, parsed)
            } else {
                const runner = useMock ? mockContributePot : contributePot
                await runner(wishlistId, parsed)
                setAmount('')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to contribute')
            if (onError) onError(wishlistId, delta)
        } finally {
            setIsSubmitting(false)
        }
    }, [wishlistId, amount, onContribute, onError, onClose, useMock, isEdit, initialAmount, t])

    // Cancel the caller's pledge entirely (edit mode only).
    const handleCancel = useCallback(async () => {
        setError(null)
        setIsSubmitting(true)

        if (onRemove) onRemove(wishlistId, initialAmount)
        else if (onContribute) onContribute(wishlistId, -initialAmount)
        onClose()

        try {
            const runner = useMock ? mockSetContribution : setContribution
            await runner(wishlistId, 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cancel')
            if (onError) onError(wishlistId, -initialAmount)
        } finally {
            setIsSubmitting(false)
        }
    }, [wishlistId, onContribute, onError, onRemove, onClose, useMock, initialAmount])

    return { amount, setAmount, isSubmitting, error, handleSubmit, handleCancel }
}
