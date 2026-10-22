import { describe, expect, it } from 'vitest'

import { validateSafeBetInput } from './validateSafeBet'

describe('validateSafeBetInput', () => {
    it('trims the title', () => {
        expect(validateSafeBetInput({ title: '  Wine  ' })).toEqual({ ok: true, value: { title: 'Wine' } })
    })

    it('rejects blank or non-string titles', () => {
        expect(validateSafeBetInput({ title: '   ' })).toEqual({ ok: false, error: 'title' })
        expect(validateSafeBetInput({ title: 5 })).toEqual({ ok: false, error: 'title' })
        expect(validateSafeBetInput({})).toEqual({ ok: false, error: 'title' })
    })

    it('rejects a title over 80 chars', () => {
        expect(validateSafeBetInput({ title: 'a'.repeat(81) })).toEqual({ ok: false, error: 'title' })
        expect(validateSafeBetInput({ title: 'a'.repeat(80) }).ok).toBe(true)
    })

    it('rejects a description over 500 chars', () => {
        expect(validateSafeBetInput({ title: 'a', description: 'b'.repeat(501) })).toEqual({
            ok: false,
            error: 'description',
        })
    })

    it('drops empty optional fields', () => {
        expect(validateSafeBetInput({ title: 'a', description: '', imageUrl: '  ' })).toEqual({
            ok: true,
            value: { title: 'a' },
        })
    })

    it('rejects unsafe or oversized image urls', () => {
        for (const imageUrl of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.io/a.png', `https://x.io/${'a'.repeat(2049)}`]) {
            expect(validateSafeBetInput({ title: 'a', imageUrl })).toEqual({ ok: false, error: 'imageUrl' })
        }
    })

    it('accepts an https image url', () => {
        expect(validateSafeBetInput({ title: 'a', imageUrl: 'https://x.io/a.png' })).toEqual({
            ok: true,
            value: { title: 'a', imageUrl: 'https://x.io/a.png' },
        })
    })
})
