import { describe, expect, it } from 'vitest'

import type { TImportedVariant } from '@/shared/lib/extractWishFields'

import type { TImportableForm } from './applyImport'
import { applyVersion, composeVariantFields, extractFirstUrl, findVersionByPrice } from './importHelpers'

describe('extractFirstUrl', () => {
    it('returns an exact link', () => {
        expect(extractFirstUrl('https://shop.fr/p/12')).toBe('https://shop.fr/p/12')
    })
    it('strips trailing punctuation', () => {
        expect(extractFirstUrl('Regarde ça : https://shop.fr/p/12?x=1.')).toBe('https://shop.fr/p/12?x=1')
        expect(extractFirstUrl('(https://a.com/x)')).toBe('https://a.com/x')
        expect(extractFirstUrl('wow https://a.com/x!?')).toBe('https://a.com/x')
    })
    it('returns the first of two links', () => {
        expect(extractFirstUrl('http://a.com/1 puis https://b.com/2')).toBe('http://a.com/1')
    })
    it('trims whitespace', () => {
        expect(extractFirstUrl('  \n https://a.com/x \n ')).toBe('https://a.com/x')
    })
    it('returns null without an http(s) link', () => {
        expect(extractFirstUrl('ftp://x')).toBeNull()
        expect(extractFirstUrl('javascript:alert(1)')).toBeNull()
        expect(extractFirstUrl('')).toBeNull()
        expect(extractFirstUrl('juste des mots')).toBeNull()
    })
})

const v = (label: string, price?: number, extra: Partial<TImportedVariant> = {}): TImportedVariant => ({
    label,
    ...(price !== undefined ? { price, currency: '€' } : {}),
    ...extra,
})

describe('findVersionByPrice', () => {
    const versions = [v('A', 149.99), v('B', 179.99)]
    it('matches the closest within tolerance', () => {
        expect(findVersionByPrice(versions, 149)).toBe(0)
        expect(findVersionByPrice(versions, 150)).toBe(0)
        expect(findVersionByPrice(versions, 149.5)).toBe(0)
        expect(findVersionByPrice(versions, 179)).toBe(1)
    })
    it('rejects far prices', () => {
        expect(findVersionByPrice(versions, 140)).toBeNull()
        expect(findVersionByPrice(versions, 165)).toBeNull()
    })
    it('rejects an exact tie', () => {
        expect(findVersionByPrice([v('A', 100), v('B', 102)], 101)).toBeNull()
    })
    it('accepts a single priced version', () => {
        expect(findVersionByPrice([v('A', 149.99)], 149.99)).toBe(0)
    })
    it('ignores unpriced versions and keeps original indexes', () => {
        expect(findVersionByPrice([v('A'), v('B')], 10)).toBeNull()
        expect(findVersionByPrice([v('A'), v('B', 50)], 50)).toBe(1)
    })
    it('returns null for 0 or NaN', () => {
        expect(findVersionByPrice(versions, 0)).toBeNull()
        expect(findVersionByPrice(versions, Number.NaN)).toBeNull()
    })
})

describe('composeVariantFields', () => {
    const base = { name: 'Casque X', description: 'Le casque', imageUrl: 'https://x.test/base.png' }

    it('keeps the version name when it contains the product name', () => {
        const out = composeVariantFields(base, v('Noir', 10, { name: 'casque x Noir' }))
        expect(out.name).toBe('casque x Noir')
    })
    it('prefixes the product name otherwise', () => {
        expect(composeVariantFields(base, v('Noir', 10, { name: 'Noir mat' })).name).toBe('Casque X Noir mat')
    })
    it('uses the product name when the version has no name', () => {
        expect(composeVariantFields(base, v('Noir')).name).toBe('Casque X')
    })
    it('puts the label on a first line before the description', () => {
        const out = composeVariantFields(base, v('256 Go', 10, { name: 'Casque X Pro', description: 'Desc v' }))
        expect(out.description).toBe('256 Go\n\nDesc v')
    })
    it('falls back to the product description', () => {
        expect(composeVariantFields(base, v('256 Go')).description).toBe('256 Go\n\nLe casque')
    })
    it('uses the label alone when there is no description', () => {
        expect(composeVariantFields({ name: 'P' }, v('Noir')).description).toBe('Noir')
    })
    it('skips the label when already in the name or description', () => {
        const inName = composeVariantFields(base, v('Noir', 10, { name: 'Casque X noir', description: 'D' }))
        expect(inName.description).toBe('D')
        const inDesc = composeVariantFields(base, v('Noir', 10, { description: 'Un casque NOIR' }))
        expect(inDesc.description).toBe('Un casque NOIR')
    })
    it('takes image and price from the version, else base image and no price', () => {
        const withAll = composeVariantFields(base, v('A', 12.5, { imageUrl: 'https://x.test/v.png' }))
        expect(withAll.imageUrl).toBe('https://x.test/v.png')
        expect(withAll.price).toBe(12.5)
        expect(withAll.currency).toBe('€')
        const none = composeVariantFields(base, v('A'))
        expect(none.imageUrl).toBe('https://x.test/base.png')
        expect(none.price).toBeUndefined()
        expect(none.currency).toBeUndefined()
    })
})

describe('applyVersion', () => {
    const empty: TImportableForm = { name: '', description: '', price: 0, currency: '€', imageUrl: '' }
    const base = { name: 'Casque X' }

    it('fillEmpty keeps typed values', () => {
        const current = { ...empty, name: 'Mine', description: 'Mienne', imageUrl: 'https://m.test/i.png' }
        const patch = applyVersion(current, base, v('Noir', 20, { imageUrl: 'https://x.test/v.png' }), 'fillEmpty')
        expect(patch).toEqual({ price: 20, currency: '€' })
    })
    it('replace overwrites provided fields without blanking', () => {
        const current = { ...empty, name: 'Mine', price: 5, imageUrl: 'https://m.test/i.png' }
        const patch = applyVersion(current, base, v('Noir'), 'replace')
        expect(patch).toEqual({ name: 'Casque X', description: 'Noir' })
    })
    it('a version without price leaves price untouched', () => {
        const patch = applyVersion({ ...empty, price: 5 }, base, v('Noir'), 'replace')
        expect(patch).not.toHaveProperty('price')
        expect(patch).not.toHaveProperty('currency')
    })
})

describe('extractFirstUrl hardening', () => {
    const fast = (text: string): string | null => {
        const start = performance.now()
        const out = extractFirstUrl(text)
        expect(performance.now() - start).toBeLessThan(100)
        return out
    }
    it('stays linear on hostile input', () => {
        fast('.'.repeat(300_000))
        fast('http://a' + '.'.repeat(300_000) + 'a')
        fast('http://'.repeat(150_000))
        fast('a'.repeat(1_000_000))
        fast('()'.repeat(150_000))
        fast('http://a' + '('.repeat(150_000) + ')'.repeat(150_000))
    })
    it('treats over-long links as no link', () => {
        expect(extractFirstUrl('https://a.com/' + 'x'.repeat(3000))).toBeNull()
    })
    it('keeps balanced parentheses', () => {
        expect(extractFirstUrl('https://en.wikipedia.org/wiki/Foo_(bar)')).toBe('https://en.wikipedia.org/wiki/Foo_(bar)')
        expect(extractFirstUrl('https://en.wikipedia.org/wiki/Foo_(bar).')).toBe('https://en.wikipedia.org/wiki/Foo_(bar)')
        expect(extractFirstUrl('https://a.com/x) and more')).toBe('https://a.com/x')
        expect(extractFirstUrl('(https://a.com/x)')).toBe('https://a.com/x')
    })
    it('stops at closing quotes and emoji', () => {
        expect(extractFirstUrl('«https://a.com/x»')).toBe('https://a.com/x')
        expect(extractFirstUrl('“https://a.com/x”')).toBe('https://a.com/x')
        expect(extractFirstUrl('https://a.com/x\u{1F44D}')).toBe('https://a.com/x')
        expect(extractFirstUrl('"https://a.com/x"')).toBe('https://a.com/x')
    })
    it('keeps an uppercase scheme as typed and rejects bare www', () => {
        expect(extractFirstUrl('HTTPS://A.COM/X')).toBe('HTTPS://A.COM/X')
        expect(extractFirstUrl('www.shop.com/x')).toBeNull()
    })
})

describe('findVersionByPrice edges', () => {
    it('tolerance is inclusive', () => {
        expect(findVersionByPrice([v('A', 1010)], 1000)).toBe(0)
        expect(findVersionByPrice([v('A', 1011)], 1000)).toBeNull()
    })
    it('rejects infinite, negative and empty', () => {
        expect(findVersionByPrice([v('A', 10)], Infinity)).toBeNull()
        expect(findVersionByPrice([v('A', 10)], -10)).toBeNull()
        expect(findVersionByPrice([], 10)).toBeNull()
    })
    it('ignores non-finite or non-positive version prices', () => {
        expect(findVersionByPrice([v('A', Number.NaN), v('B', 0), v('C', 5)], 5)).toBe(2)
        expect(findVersionByPrice([v('A', 0)], 0.5)).toBeNull()
    })
})
