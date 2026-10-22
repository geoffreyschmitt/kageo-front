import { describe, expect, it } from 'vitest'

import { decideLinkAction } from './linkImportPolicy'

const base = { isEdit: false, savedUrl: '', url: 'https://shop.test/p', lastHandledUrl: '' }

describe('decideLinkAction', () => {
    it('fetches a new valid url in add mode', () => {
        expect(decideLinkAction(base)).toBe('fetchFillEmpty')
    })

    it('ignores empty, invalid and non-http(s) urls', () => {
        for (const url of ['', 'not a url', 'javascript:alert(1)', 'ftp://x.test/f']) {
            expect(decideLinkAction({ ...base, url })).toBe('ignore')
        }
    })

    it('ignores the url handled last', () => {
        expect(decideLinkAction({ ...base, lastHandledUrl: base.url })).toBe('ignore')
    })

    it('edit: ignores the saved url', () => {
        expect(decideLinkAction({ ...base, isEdit: true, savedUrl: base.url })).toBe('ignore')
    })

    it('edit: asks before replacing when the saved link differs', () => {
        expect(decideLinkAction({ ...base, isEdit: true, savedUrl: 'https://old.test/x' })).toBe('askReplace')
    })

    it('edit without a saved link behaves like add', () => {
        expect(decideLinkAction({ ...base, isEdit: true })).toBe('fetchFillEmpty')
    })

    it('edit: ignores a handled url even if it differs from saved', () => {
        expect(
            decideLinkAction({ ...base, isEdit: true, savedUrl: 'https://old.test/x', lastHandledUrl: base.url }),
        ).toBe('ignore')
    })

    it('add mode ignores savedUrl', () => {
        expect(decideLinkAction({ ...base, savedUrl: 'https://old.test/x' })).toBe('fetchFillEmpty')
    })
})
