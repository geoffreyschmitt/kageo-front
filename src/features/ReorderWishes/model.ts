import { useCallback, useState } from 'react'

import { moveToTop, replaceSectionOrder } from '@/shared/lib/wishOrder'

export const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index])

// Saves only when something actually moved; resolves once the save is done.
export const commitDraft = async (
    allIds: string[],
    draft: string[],
    onSave: (order: string[]) => Promise<void> | void,
) => {
    if (!sameOrder(allIds, draft)) await onSave(draft)
}

type TParams = {
    // The current global order of the wishes that can be reordered.
    allIds: string[]
    onSave: (order: string[]) => Promise<void> | void
}

// Reorder mode: the owner edits a draft of the global order, then saves it ("Done") or drops it
// ("Cancel"). A section is a subset of the draft, so section edits are merged back in place.
export function useReorderModel({ allIds, onSave }: TParams) {
    const [isReordering, setIsReordering] = useState(false)
    const [draft, setDraft] = useState<string[]>(allIds)

    const start = useCallback(() => {
        setDraft(allIds)
        setIsReordering(true)
    }, [allIds])

    const cancel = useCallback(() => setIsReordering(false), [])

    const done = useCallback(async () => {
        await commitDraft(allIds, draft, onSave)
        setIsReordering(false)
    }, [allIds, draft, onSave])

    const moveSection = useCallback(
        (sectionIds: string[]) => setDraft((current) => replaceSectionOrder(current, sectionIds)),
        [],
    )

    const toTop = useCallback((id: string) => setDraft((current) => moveToTop(current, id)), [])

    return { isReordering, draft, start, cancel, done, moveSection, toTop }
}
