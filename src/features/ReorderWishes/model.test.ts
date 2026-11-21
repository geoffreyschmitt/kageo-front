import { describe, expect, it, vi } from 'vitest'

import { commitDraft, sameOrder } from './model'

describe('sameOrder', () => {
    it('is true only for the same ids in the same order', () => {
        expect(sameOrder(['a', 'b'], ['a', 'b'])).toBe(true)
        expect(sameOrder(['a', 'b'], ['b', 'a'])).toBe(false)
        expect(sameOrder(['a'], ['a', 'b'])).toBe(false)
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
