'use client'

import { useState, useCallback } from 'react'
import { createPot } from '@/shared/api/wishlist/createPot'
import type { TCreatePotModalState } from './ui/CreatePotModal.types'

type TUseCreatePotModelParams = {
    wishlistId: string
    isLoggedIn: boolean
    isInvited: boolean
    onPotCreated: (creatorId: string, creatorName: string) => void
    useMock?: boolean
}

export const useCreatePotModel = ({
    wishlistId,
    isLoggedIn,
    isInvited,
    onPotCreated,
    useMock = false,
}: TUseCreatePotModelParams) => {
    const [modalState, setModalState] = useState<TCreatePotModalState>('closed')
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const openModal = useCallback(() => {
        if (!isLoggedIn) {
            setModalState('login-required')
            return
        }
        if (!isInvited) {
            setModalState('invite-required')
            return
        }
        setModalState('confirm')
    }, [isLoggedIn, isInvited])

    const closeModal = useCallback(() => {
        setModalState('closed')
        setError(null)
    }, [])

    const handleConfirm = useCallback(async () => {
        setIsCreating(true)
        setError(null)

        try {
            if (useMock) {
                await new Promise(resolve => setTimeout(resolve, 400))
                onPotCreated('mock-creator-id', 'You')
                closeModal()
                return
            }

            const pot = await createPot(wishlistId)
            onPotCreated(pot.creatorId, pot.creatorName)
            closeModal()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create pot')
        } finally {
            setIsCreating(false)
        }
    }, [wishlistId, useMock, onPotCreated, closeModal])

    return { modalState, openModal, closeModal, isCreating, error, handleConfirm }
}
