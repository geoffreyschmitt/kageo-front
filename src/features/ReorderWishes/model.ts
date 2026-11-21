import { useCallback, useState } from 'react'

import { moveToTop, replaceSectionOrder } from '@/shared/lib/wishOrder'

export const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index])

// The draft is a snapshot taken when reordering starts, while wishes can still be added or
// deleted (another tab, a suggestion). Wishes added since go first, as they do everywhere else;
// deleted ones drop out.
export const reconcileDraft = (draft: string[], allIds: string[]): string[] => {
    const current = new Set(allIds)
    const known = new Set(draft)
    return [...allIds.filter((id) => !known.has(id)), ...draft.filter((id) => current.has(id))]
}

export const moveSectionInDraft = (draft: string[], allIds: string[], sectionIds: string[]): string[] =>
    replaceSectionOrder(reconcileDraft(draft, allIds), sectionIds)

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
        await commitDraft(allIds, reconcileDraft(draft, allIds), onSave)
        setIsReordering(false)
    }, [allIds, draft, onSave])

    const moveSection = useCallback(
        (sectionIds: string[]) => setDraft((current) => moveSectionInDraft(current, allIds, sectionIds)),
        [allIds],
    )

    const toTop = useCallback(
        (id: string) => setDraft((current) => moveToTop(reconcileDraft(current, allIds), id)),
        [allIds],
    )

    return { isReordering, draft, start, cancel, done, moveSection, toTop }
}
