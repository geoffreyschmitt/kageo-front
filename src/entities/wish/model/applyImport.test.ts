import { describe, expect, it } from 'vitest'

import { applyImport, type TImportableForm } from './applyImport'

const empty: TImportableForm = { name: '', description: '', price: 0, currency: '€', imageUrl: '' }

describe('applyImport fillEmpty', () => {
    it('keeps a typed name', () => {
        const patch = applyImport({ ...empty, name: 'Mine' }, { name: 'Theirs' }, 'fillEmpty')
        expect(patch).toEqual({})
    })

    it('fills empty and whitespace-only text', () => {
        const patch = applyImport(
            { ...empty, name: '   ' },
            { name: 'N', description: 'D', imageUrl: 'https://x.test/i.png' },
            'fillEmpty',
        )
        expect(patch).toEqual({ name: 'N', description: 'D', imageUrl: 'https://x.test/i.png' })
    })

    it('fills price and currency together when price is empty', () => {
        expect(applyImport(empty, { price: 12.5, currency: '$' }, 'fillEmpty')).toEqual({ price: 12.5, currency: '$' })
        expect(applyImport({ ...empty, price: NaN }, { price: 3, currency: '£' }, 'fillEmpty')).toEqual({
            price: 3,
            currency: '£',
        })
    })

    it('leaves currency alone when the price is already set', () => {
        expect(applyImport({ ...empty, price: 10 }, { price: 3, currency: '$' }, 'fillEmpty')).toEqual({})
    })

    it('does not set currency without a price', () => {
        expect(applyImport(empty, { currency: '$' }, 'fillEmpty')).toEqual({})
    })

    it('ignores absent fields', () => {
        expect(applyImport(empty, {}, 'fillEmpty')).toEqual({})
    })
})

describe('applyImport replace', () => {
    const current: TImportableForm = { name: 'a', description: 'b', price: 5, currency: '€', imageUrl: 'https://o.test/i' }

    it('overwrites every provided field', () => {
        expect(
            applyImport(
                current,
                { name: 'N', description: 'D', imageUrl: 'https://x.test/i', price: 9, currency: '$' },
                'replace',
            ),
        ).toEqual({ name: 'N', description: 'D', imageUrl: 'https://x.test/i', price: 9, currency: '$' })
    })

    it('leaves fields the page does not provide', () => {
        expect(applyImport(current, { name: 'N' }, 'replace')).toEqual({ name: 'N' })
    })

    it('never blanks a field', () => {
        expect(applyImport(current, { name: '', description: '  ', imageUrl: '' }, 'replace')).toEqual({})
    })

    it('ignores a non-positive price, and replaces a price that comes without a currency (keeping the old currency)', () => {
        expect(applyImport(current, { price: 0, currency: '$' }, 'replace')).toEqual({})
        expect(applyImport(current, { price: 7 }, 'replace')).toEqual({ price: 7 })
    })
})
