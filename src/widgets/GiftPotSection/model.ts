'use client'

import { useCallback, useState } from 'react'

import { getGiftPot, type TGiftPotView } from '@/shared/api/wish/getGiftPot'

/** Above this many contributors the organiser list scrolls instead of growing. */
export const GIFT_POT_LIST_SCROLL_THRESHOLD = 3

type TUseGiftPotSectionModelParams = {
    wishId: string
    onGiftPotRefreshed?: (wishId: string, view: TGiftPotView | null) => void
}

export const useGiftPotSectionModel = ({ wishId, onGiftPotRefreshed }: TUseGiftPotSectionModelParams) => {
    const [modal, setModal] = useState<'add' | 'edit' | null>(null)

    // Fetch the authoritative pot view once a write has landed and hand it back
    // to the page. The optimistic value is already on screen, so this only
    // reconciles — nothing moves unless the server genuinely differs.
    const reconcile = useCallback(async () => {
        if (!onGiftPotRefreshed) return
        try {
            onGiftPotRefreshed(wishId, await getGiftPot(wishId))
        } catch {
            /* keep the optimistic view */
        }
    }, [wishId, onGiftPotRefreshed])

    return {
        modal,
        openAdd: useCallback(() => setModal('add'), []),
        openEdit: useCallback(() => setModal('edit'), []),
        closeModal: useCallback(() => setModal(null), []),
        reconcile,
    }
}
