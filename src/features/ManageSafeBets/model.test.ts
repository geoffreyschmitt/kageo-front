import { describe, expect, it } from 'vitest'

import { moveId } from './model'

describe('moveId', () => {
    it('swaps with the next neighbour', () => {
        expect(moveId(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
    })
    it('swaps with the previous neighbour', () => {
        expect(moveId(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b'])
    })
    it('clamps at both ends', () => {
        expect(moveId(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
        expect(moveId(['a', 'b'], 'b', 1)).toEqual(['a', 'b'])
    })
    it('returns a new array and ignores unknown ids', () => {
        const ids = ['a', 'b']
        expect(moveId(ids, 'a', 1)).not.toBe(ids)
        expect(moveId(ids, 'x', 1)).toEqual(['a', 'b'])
        expect(ids).toEqual(['a', 'b'])
    })
})
