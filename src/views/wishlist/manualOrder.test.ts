import { describe, expect, it } from 'vitest'

import { partitionWishes } from './partitionWishes'

const wish = (id: string, priority: 'high' | 'medium' | 'low', day: number, status = 'wanted') =>
    ({ id, priority, status, createdAt: `2026-01-0${day}T00:00:00.000Z` }) as never

const ids = (list: { id: string }[]) => list.map((w) => w.id)

describe('partitionWishes', () => {
    it('splits into most wanted and the rest, each in the stored order', () => {
        const items = [wish('a', 'high', 1), wish('b', 'low', 2), wish('c', 'low', 3)]
        const { mostWanted, regular } = partitionWishes(items, ['b', 'a'])
        expect(ids(mostWanted)).toEqual(['a'])
        expect(ids(regular)).toEqual(['c', 'b'])
    })

    it('keeps a purchased high-priority wish in the regular list', () => {
        const items = [wish('a', 'high', 1, 'purchased'), wish('b', 'high', 2)]
        const { mostWanted, regular } = partitionWishes(items, [])
        expect(ids(mostWanted)).toEqual(['b'])
        expect(ids(regular)).toEqual(['a'])
    })

    it('keeps the relative position of a wish whose priority changed after reordering', () => {
        const order = ['x', 'y', 'z']
        const before = partitionWishes([wish('x', 'low', 1), wish('y', 'low', 2), wish('z', 'low', 3)], order)
        expect(ids(before.regular)).toEqual(['x', 'y', 'z'])
        const after = partitionWishes([wish('x', 'low', 1), wish('y', 'high', 2), wish('z', 'low', 3)], order)
        expect(ids(after.mostWanted)).toEqual(['y'])
        expect(ids(after.regular)).toEqual(['x', 'z'])
    })
})
