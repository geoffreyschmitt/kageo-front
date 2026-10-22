import { afterEach, describe, expect, it, vi } from 'vitest'

import { importWishFromUrl } from './importFromUrl'

const mock = (body: unknown) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })))

afterEach(() => vi.unstubAllGlobals())

describe('importWishFromUrl', () => {
    it('returns null when nothing was found', async () => {
        mock({ found: false, fields: {} })
        expect(await importWishFromUrl('https://a.com')).toBeNull()
    })
    it('drops an empty variants array', async () => {
        mock({ found: true, fields: { name: 'N' }, variants: [] })
        expect(await importWishFromUrl('https://a.com')).toEqual({ fields: { name: 'N' } })
    })
    it('keeps variants', async () => {
        mock({ found: true, fields: { name: 'N' }, variants: [{ label: 'A' }] })
        expect(await importWishFromUrl('https://a.com')).toEqual({ fields: { name: 'N' }, variants: [{ label: 'A' }] })
    })
})
