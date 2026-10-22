import { describe, expect, it } from 'vitest'

import type { TImportedVariant } from '@/shared/lib/extractWishFields'

import { decideDismissal, formatVersionPrice, decideFillStart, decideImportOutcome, isRateLimitError, toVersionChoices } from './importFlow'

const v = (label: string, price?: number): TImportedVariant => ({
    label,
    ...(price !== undefined ? { price, currency: '€' } : {}),
})

const base = { name: 'Phone', description: 'A phone', imageUrl: 'https://i.test/p.jpg' }
const variants = [v('128 GB', 149.99), v('256 GB', 199.99)]

describe('decideFillStart', () => {
    it('does nothing without an http(s) link', () => {
        expect(decideFillStart({ linkText: 'just words' })).toEqual({ kind: 'none' })
        expect(decideFillStart({ linkText: '' })).toEqual({ kind: 'none' })
    })
    it('runs for an exact link without touching the field', () => {
        expect(decideFillStart({ linkText: 'https://a.com/x' })).toEqual({
            kind: 'run',
            url: 'https://a.com/x',
            replaceFieldText: false,
        })
    })
    it('extracts the link from share text and replaces the field text', () => {
        expect(decideFillStart({ linkText: 'Look at this https://a.com/x !' })).toEqual({
            kind: 'run',
            url: 'https://a.com/x',
            replaceFieldText: true,
        })
    })
    it('replaces surrounding whitespace too', () => {
        expect(decideFillStart({ linkText: '  https://a.com/x ' })).toMatchObject({ replaceFieldText: true })
    })
    it('asks the mode on Edit with a saved link', () => {
        expect(decideFillStart({ linkText: 'https://a.com/x', savedUrl: 'https://old.com' })).toMatchObject({
            kind: 'askMode',
            url: 'https://a.com/x',
        })
    })
    it('runs on Edit without a saved link', () => {
        expect(decideFillStart({ linkText: 'https://a.com/x', savedUrl: '' })).toMatchObject({ kind: 'run' })
        expect(decideFillStart({ linkText: 'https://a.com/x', savedUrl: '  ' })).toMatchObject({ kind: 'run' })
    })
})

describe('decideImportOutcome', () => {
    it('reports notFound for a null result', () => {
        expect(decideImportOutcome(null, 'fillEmpty', 0)).toEqual({ kind: 'notFound' })
    })
    it('applies the fields with the mode when there are no versions', () => {
        const fields = { ...base, price: 10, currency: '€' }
        expect(decideImportOutcome({ fields }, 'fillEmpty', 0)).toEqual({ kind: 'applyFields', fields, mode: 'fillEmpty' })
        expect(decideImportOutcome({ fields }, 'replace', 50)).toEqual({ kind: 'applyFields', fields, mode: 'replace' })
        expect(decideImportOutcome({ fields, variants: [] }, 'fillEmpty', 0)).toMatchObject({ kind: 'applyFields' })
    })
    it('asks when no price is typed', () => {
        expect(decideImportOutcome({ fields: base, variants }, 'fillEmpty', 0)).toEqual({
            kind: 'ask',
            base,
            variants,
            mode: 'fillEmpty',
        })
        expect(decideImportOutcome({ fields: base, variants }, 'fillEmpty', Number.NaN)).toMatchObject({ kind: 'ask' })
    })
    it('asks in Replace mode even with a price typed', () => {
        expect(decideImportOutcome({ fields: base, variants }, 'replace', 149.99)).toMatchObject({
            kind: 'ask',
            mode: 'replace',
        })
    })
    it('picks the version matching a typed price', () => {
        expect(decideImportOutcome({ fields: base, variants }, 'fillEmpty', 150)).toEqual({
            kind: 'applyVersion',
            base,
            variant: variants[0],
            mode: 'fillEmpty',
        })
    })
    it('applies only product-level fields when the typed price matches no version', () => {
        expect(decideImportOutcome({ fields: base, variants }, 'fillEmpty', 90)).toEqual({
            kind: 'applyFields',
            fields: base,
            mode: 'fillEmpty',
        })
    })
})

describe('decideDismissal', () => {
    const asking = {
        status: 'chooseVersion' as const,
        askedUrl: 'https://a.com/x',
        linkText: 'https://a.com/x',
        askedPrice: 0,
        price: 0,
    }
    it('keeps asking when nothing changed', () => {
        expect(decideDismissal(asking)).toBe('none')
        expect(decideDismissal({ ...asking, linkText: ' https://a.com/x ' })).toBe('none')
    })
    it('does nothing outside a question', () => {
        for (const status of ['idle', 'loading', 'found', 'notFound'] as const) {
            expect(decideDismissal({ ...asking, status, linkText: 'other' })).toBe('none')
        }
    })
    it('dismisses to idle when the link changes', () => {
        expect(decideDismissal({ ...asking, linkText: 'https://a.com/y' })).toBe('idle')
        expect(decideDismissal({ ...asking, status: 'chooseMode', linkText: '' })).toBe('idle')
    })
    it('applies the product fields when a price is typed during the version question', () => {
        expect(decideDismissal({ ...asking, price: 150 })).toBe('applyBase')
    })
    it('ignores a price that was already there when the question appeared', () => {
        expect(decideDismissal({ ...asking, askedPrice: 80, price: 80 })).toBe('none')
        expect(decideDismissal({ ...asking, askedPrice: 80, price: 90 })).toBe('applyBase')
    })
    it('ignores a price typed during the mode question', () => {
        expect(decideDismissal({ ...asking, status: 'chooseMode', price: 150 })).toBe('none')
    })
    it('prefers the link change over a typed price', () => {
        expect(decideDismissal({ ...asking, linkText: 'x', price: 150 })).toBe('idle')
    })
})

describe('toVersionChoices', () => {
    it('keeps label, price and currency only', () => {
        expect(toVersionChoices([{ label: '128 GB', price: 1, currency: '€', name: 'n', imageUrl: 'https://i' }, { label: '' }]))
            .toEqual([{ label: '128 GB', price: 1, currency: '€' }, { label: '' }])
    })
})

describe('isRateLimitError', () => {
    it('detects a 429 error', () => {
        expect(isRateLimitError(new Error('API error 429: rate limited'))).toBe(true)
        expect(isRateLimitError(new Error('API error 500: id 4290'))).toBe(false)
        expect(isRateLimitError(new Error('Request failed: 429'))).toBe(false)
        expect(isRateLimitError('429')).toBe(false)
    })
})

describe('formatVersionPrice', () => {
    const plain = (text: string) => text.replace(/[  ]/g, ' ')
    it('formats in the reader locale', () => {
        expect(plain(formatVersionPrice(149.99, '€', 'fr'))).toBe('149,99 €')
        expect(plain(formatVersionPrice(149.99, '€', 'en'))).toBe('€149.99')
    })
    it('maps $ and £', () => {
        expect(plain(formatVersionPrice(10, '$', 'en'))).toBe('$10.00')
        expect(plain(formatVersionPrice(10, '£', 'en'))).toBe('£10.00')
    })
    it('shows no decimals for yen', () => {
        expect(plain(formatVersionPrice(1500, '¥', 'en'))).toMatch(/1,500$/)
    })
    it('falls back to symbol and two decimals for an unknown symbol', () => {
        expect(formatVersionPrice(5, 'CHF', 'fr')).toBe('CHF5.00')
        expect(formatVersionPrice(5, undefined, 'fr')).toBe('5.00')
    })
})
