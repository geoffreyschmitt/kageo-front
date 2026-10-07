import { describe, expect, it } from 'vitest'

import { reconcileFundedStatus } from './reconcileFundedStatus'

describe('reconcileFundedStatus', () => {
    it('flips wanted -> funded once the goal is reached', () => {
        expect(reconcileFundedStatus('wanted', 100, 100)).toBe('funded')
        expect(reconcileFundedStatus('wanted', 150, 100)).toBe('funded')
    })

    it('flips funded -> wanted when pledges drop below the goal', () => {
        expect(reconcileFundedStatus('funded', 99, 100)).toBe('wanted')
    })

    it('does nothing when the status already matches', () => {
        expect(reconcileFundedStatus('wanted', 50, 100)).toBeNull()
        expect(reconcileFundedStatus('funded', 100, 100)).toBeNull()
    })

    it('never touches reserved, purchased or proposed wishes', () => {
        for (const status of ['reserved', 'purchased', 'proposed']) {
            expect(reconcileFundedStatus(status, 500, 100)).toBeNull()
            expect(reconcileFundedStatus(status, 0, 100)).toBeNull()
        }
    })

    it('treats a goal of 0 as never reached', () => {
        expect(reconcileFundedStatus('wanted', 10, 0)).toBeNull()
        expect(reconcileFundedStatus('funded', 10, 0)).toBe('wanted')
    })
})
