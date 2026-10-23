import {describe, expect, it} from 'vitest'

import {hidesGuestState, resolveVisibleStatus} from './visibleStatus'

describe('resolveVisibleStatus', () => {
    it.each(['reserved', 'purchased', 'funded'] as const)('masks %s from the owner of a live list', (status) => {
        expect(resolveVisibleStatus({status, isOwner: true, isHistory: false})).toBe('wanted')
    })

    it.each(['reserved', 'purchased', 'funded'] as const)('reveals %s to the owner of an archived list', (status) => {
        expect(resolveVisibleStatus({status, isOwner: true, isHistory: true})).toBe(status)
    })

    it('never masks for guests', () => {
        expect(resolveVisibleStatus({status: 'reserved', isOwner: false, isHistory: false})).toBe('reserved')
    })

    it('leaves wanted and proposed alone for the owner', () => {
        expect(resolveVisibleStatus({status: 'proposed', isOwner: true, isHistory: false})).toBe('proposed')
        expect(resolveVisibleStatus({status: 'wanted', isOwner: true, isHistory: false})).toBe('wanted')
    })
})

describe('hidesGuestState', () => {
    it('depends on isOwner, not on whichever action flags a caller passes', () => {
        expect(hidesGuestState({isOwner: true, isHistory: false})).toBe(true)
        expect(hidesGuestState({isOwner: false, isHistory: false})).toBe(false)
        expect(hidesGuestState({isOwner: true, isHistory: true})).toBe(false)
    })
})
