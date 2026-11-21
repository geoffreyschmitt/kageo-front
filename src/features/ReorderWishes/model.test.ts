import { describe, expect, it, vi } from 'vitest'

import { commitDraft, moveSectionInDraft, reconcileDraft, sameOrder } from './model'

describe('sameOrder', () => {
    it('is true only for the same ids in the same order', () => {
        expect(sameOrder(['a', 'b'], ['a', 'b'])).toBe(true)
        expect(sameOrder(['a', 'b'], ['b', 'a'])).toBe(false)
        expect(sameOrder(['a'], ['a', 'b'])).toBe(false)
    })
})

describe('reconcileDraft', () => {
    it('puts wishes added since the draft started first, in their current order', () => {
        expect(reconcileDraft(['a', 'b'], ['w', 'a', 'b'])).toEqual(['w', 'a', 'b'])
    })

    it('drops wishes that no longer exist', () => {
        expect(reconcileDraft(['a', 'gone', 'b'], ['a', 'b'])).toEqual(['a', 'b'])
    })

    it('keeps the draft order for wishes that are still there', () => {
        expect(reconcileDraft(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b'])
    })
})

describe('moveSectionInDraft', () => {
    it('does not lose a wish when one was added after the draft started', () => {
        // The draft was taken as [a, b, c]; W was added since, so the section now shows [W, a, b, c].
        // Dragging c to second place gives the section [W, c, a, b].
        const next = moveSectionInDraft(['a', 'b', 'c'], ['W', 'a', 'b', 'c'], ['W', 'c', 'a', 'b'])
        expect([...next].sort()).toEqual(['W', 'a', 'b', 'c'])
        expect(next).toEqual(['W', 'c', 'a', 'b'])
    })
})

describe('commitDraft', () => {
    it('saves the draft once when the order changed', async () => {
        const onSave = vi.fn()
        await commitDraft(['a', 'b', 'c'], ['c', 'a', 'b'], onSave)
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave).toHaveBeenCalledWith(['c', 'a', 'b'])
    })

    it('does not save when nothing moved', async () => {
        const onSave = vi.fn()
        await commitDraft(['a', 'b'], ['a', 'b'], onSave)
        expect(onSave).not.toHaveBeenCalled()
    })

    it('waits for the save to finish', async () => {
        let saved = false
        await commitDraft(['a', 'b'], ['b', 'a'], async () => {
            await Promise.resolve()
            saved = true
        })
        expect(saved).toBe(true)
    })
})
