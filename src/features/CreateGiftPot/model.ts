'use client'

import { useState, useCallback } from 'react'
import { createGiftPot } from '@/shared/api/wish/createGiftPot'
import type { TCreateGiftPotModalState } from './ui/CreateGiftPotModal.types'

type TUseCreateGiftPotModelParams = {
    wishId: string
    isLoggedIn: boolean
    isInvited: boolean
    onPotCreated: (creatorId: string, creatorName: string) => void
}

export const useCreateGiftPotModel = ({
    wishId,
    isLoggedIn,
    isInvited,
    onPotCreated,
}: TUseCreateGiftPotModelParams) => {
    const [modalState, setModalState] = useState<TCreateGiftPotModalState>('closed')
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

            const pot = await createGiftPot(wishId)
            onPotCreated(pot.creatorId, pot.creatorName)
            closeModal()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create pot')
        } finally {
            setIsCreating(false)
        }
    }, [wishId, onPotCreated, closeModal])

    return { modalState, openModal, closeModal, isCreating, error, handleConfirm }
}
