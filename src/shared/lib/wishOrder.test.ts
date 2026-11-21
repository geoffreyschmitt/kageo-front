import { describe, expect, it } from 'vitest'

import { moveToTop, replaceSectionOrder, resolveOrder, sortByStoredOrder } from './wishOrder'

const wishes = [
    { id: 'a', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', createdAt: '2026-01-02T00:00:00.000Z' },
    { id: 'c', createdAt: '2026-01-03T00:00:00.000Z' },
    { id: 'd', createdAt: '2026-01-04T00:00:00.000Z' },
]
const ids = (list: { id: string }[]) => list.map((w) => w.id)

describe('sortByStoredOrder', () => {
    it('puts unlisted wishes first (newest first), then the listed ones by index', () => {
        expect(ids(sortByStoredOrder(wishes, ['b', 'a']))).toEqual(['d', 'c', 'b', 'a'])
        expect(ids(sortByStoredOrder(wishes, ['a', 'b']))).toEqual(['d', 'c', 'a', 'b'])
    })

    it('is newest first when no order is stored', () => {
        expect(ids(sortByStoredOrder(wishes, null))).toEqual(['d', 'c', 'b', 'a'])
        expect(ids(sortByStoredOrder(wishes, undefined))).toEqual(['d', 'c', 'b', 'a'])
    })

    it('ignores stale ids in the stored order', () => {
        expect(ids(sortByStoredOrder(wishes, ['zzz', 'a']))).toEqual(['d', 'c', 'b', 'a'])
    })

    it('does not mutate its input', () => {
        const input = [...wishes]
        sortByStoredOrder(input, ['a'])
        expect(input).toEqual(wishes)
    })
})

describe('resolveOrder', () => {
    it('keeps the request first and appends omitted wishes in their current order', () => {
        expect(resolveOrder(['b', 'a'], ['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual(['b', 'a', 'c'])
    })

    it('rejects duplicates and unknown ids', () => {
        expect(resolveOrder(['a', 'a'], ['a', 'b'], null)).toBeNull()
        expect(resolveOrder(['x'], ['a', 'b'], null)).toBeNull()
    })

    it('never returns ids of wishes that no longer exist', () => {
        expect(resolveOrder(['b'], ['a', 'b'], ['gone', 'a'])).toEqual(['b', 'a'])
    })

    it('falls back to the wish id order when nothing is stored', () => {
        expect(resolveOrder([], ['a', 'b'], null)).toEqual(['a', 'b'])
    })
})

describe('replaceSectionOrder', () => {
    it('refills the section slots in the new order and leaves the rest in place', () => {
        expect(replaceSectionOrder(['a', 'b', 'c', 'd'], ['d', 'b'])).toEqual(['a', 'd', 'c', 'b'])
    })

    it('is a no-op for an empty section', () => {
        expect(replaceSectionOrder(['a', 'b'], [])).toEqual(['a', 'b'])
    })
})

describe('moveToTop', () => {
    it('moves an id to the front without mutating the input', () => {
        const input = ['a', 'b', 'c']
        expect(moveToTop(input, 'c')).toEqual(['c', 'a', 'b'])
        expect(input).toEqual(['a', 'b', 'c'])
    })

    it('returns an unchanged copy when the id is absent', () => {
        expect(moveToTop(['a', 'b', 'c'], 'x')).toEqual(['a', 'b', 'c'])
    })
})
