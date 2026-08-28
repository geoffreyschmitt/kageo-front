'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

import { contributeGiftPot, setGiftContribution } from '@/shared/api/wish/contributeGiftPot'

type TUseContributeGiftPotModelParams = {
    wishId: string
    onContribute?: (wishId: string, amount: number) => void
    onError?: (wishId: string, amount: number) => void
    onRemove?: (wishId: string, removedAmount: number) => void
    /** fired once the server write has landed — safe point to re-read the pot */
    onSaved?: () => void
    onClose: () => void
    useMock?: boolean
    mode?: 'add' | 'edit'
    initialAmount?: number
}

export const useContributeGiftPotModel = ({
    wishId,
    onContribute,
    onError,
    onRemove,
    onSaved,
    onClose,
    useMock = false,
    mode = 'add',
    initialAmount = 0,
}: TUseContributeGiftPotModelParams) => {
    const t = useTranslations('contributeGiftPotModal')
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
        if (onContribute) onContribute(wishId, delta)
        onClose()

        try {
            if (useMock) {
                await new Promise(resolve => setTimeout(resolve, 400))
            } else if (isEdit) {
                await setGiftContribution(wishId, parsed)
            } else {
                await contributeGiftPot(wishId, parsed)
            }
            if (!isEdit) setAmount('')
            onSaved?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to contribute')
            if (onError) onError(wishId, delta)
        } finally {
            setIsSubmitting(false)
        }
    }, [wishId, amount, onContribute, onError, onSaved, onClose, useMock, isEdit, initialAmount, t])

    // Cancel the caller's pledge entirely (edit mode only).
    const handleCancel = useCallback(async () => {
        setError(null)
        setIsSubmitting(true)

        if (onRemove) onRemove(wishId, initialAmount)
        else if (onContribute) onContribute(wishId, -initialAmount)
        onClose()

        try {
            if (useMock) {
                await new Promise(resolve => setTimeout(resolve, 400))
            } else {
                await setGiftContribution(wishId, 0)
            }
            onSaved?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cancel')
            if (onError) onError(wishId, -initialAmount)
        } finally {
            setIsSubmitting(false)
        }
    }, [wishId, onContribute, onError, onRemove, onSaved, onClose, useMock, initialAmount])

    return { amount, setAmount, isSubmitting, error, handleSubmit, handleCancel }
}
