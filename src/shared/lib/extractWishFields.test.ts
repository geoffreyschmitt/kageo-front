import { describe, expect, it } from 'vitest'

import { extractWishFields, ISO_TO_SYMBOL } from './extractWishFields'

const URL = 'https://shop.example.com/products/lamp'

const ld = (data: unknown) =>
    `<script type="application/ld+json">${typeof data === 'string' ? data : JSON.stringify(data)}</script>`
const page = (head: string) => `<html><head>${head}</head><body></body></html>`
const og = (property: string, content: string) => `<meta property="${property}" content="${content}">`

const product = (extra: Record<string, unknown> = {}) => ({ '@type': 'Product', name: 'Lamp', ...extra })

describe('ISO_TO_SYMBOL', () => {
    it('maps the form currencies', () => {
        expect(ISO_TO_SYMBOL).toEqual({ EUR: '€', USD: '$', GBP: '£', JPY: '¥' })
    })
})

describe('extractWishFields', () => {
    it('reads a JSON-LD Product', () => {
        const html = page(
            ld(
                product({
                    description: 'Nice lamp',
                    image: 'https://cdn.example.com/a.jpg',
                    offers: { '@type': 'Offer', price: '129.90', priceCurrency: 'EUR' },
                }),
            ),
        )
        expect(extractWishFields(html, URL)).toEqual({
            name: 'Lamp',
            description: 'Nice lamp',
            imageUrl: 'https://cdn.example.com/a.jpg',
            price: 129.9,
            currency: '€',
        })
    })

    it('reads Open Graph only', () => {
        const html = page(og('og:title', 'OG Lamp') + og('og:description', 'OG desc') + og('og:image', 'https://x.com/i.png'))
        expect(extractWishFields(html, URL)).toEqual({
            name: 'OG Lamp',
            description: 'OG desc',
            imageUrl: 'https://x.com/i.png',
        })
    })

    it('prefers JSON-LD name and og:description over meta description', () => {
        const html = page(
            ld(product({ description: 'ld desc' })) +
                og('og:title', 'OG title') +
                og('og:description', 'og desc') +
                '<meta name="description" content="meta desc">',
        )
        const r = extractWishFields(html, URL)
        expect(r.name).toBe('Lamp')
        expect(r.description).toBe('og desc')
    })

    it('falls back to meta description, then JSON-LD description, and <title>', () => {
        expect(extractWishFields(page('<title>Only title</title><meta name="description" content="meta desc">'), URL)).toEqual({
            name: 'Only title',
            description: 'meta desc',
        })
        expect(extractWishFields(page(ld(product({ description: 'ld desc' }))), URL).description).toBe('ld desc')
    })

    it('returns {} when there is nothing', () => {
        expect(extractWishFields('<html><body>hi</body></html>', URL)).toEqual({})
        expect(extractWishFields('', URL)).toEqual({})
    })

    it('handles JSON-LD arrays, @graph and @type arrays', () => {
        expect(extractWishFields(page(ld([{ '@type': 'WebSite', name: 'Shop' }, product()])), URL).name).toBe('Lamp')
        expect(extractWishFields(page(ld({ '@graph': [{ '@type': 'Organization', name: 'Org' }, product()] })), URL).name).toBe('Lamp')
        expect(extractWishFields(page(ld({ '@type': ['Product', 'ItemList'], name: 'Multi' })), URL).name).toBe('Multi')
    })

    it('uses the Product among several ld+json blocks', () => {
        const html = page(ld({ '@type': 'BreadcrumbList' }) + ld(product()))
        expect(extractWishFields(html, URL).name).toBe('Lamp')
    })

    it('handles offers as object, array and AggregateOffer', () => {
        const priced = (offers: unknown) => extractWishFields(page(ld(product({ offers }))), URL)
        expect(priced({ price: 10, priceCurrency: 'USD' })).toMatchObject({ price: 10, currency: '$' })
        expect(priced([{ price: '12.5', priceCurrency: 'GBP' }, { price: 20, priceCurrency: 'GBP' }])).toMatchObject({
            price: 12.5,
            currency: '£',
        })
        expect(priced({ '@type': 'AggregateOffer', lowPrice: '49', priceCurrency: 'JPY' })).toMatchObject({
            price: 49,
            currency: '¥',
        })
    })

    it('uses priceSpecification when price is nested', () => {
        const r = extractWishFields(
            page(ld(product({ offers: { priceSpecification: { price: '5.00', priceCurrency: 'EUR' } } }))),
            URL,
        )
        expect(r).toMatchObject({ price: 5, currency: '€' })
    })

    it.each([
        ['129,90', 129.9],
        ['129.90', 129.9],
        ['1 299,90', 1299.9],
        ['1 299,90', 1299.9],
        ['1 299,90', 1299.9],
        ['1,299.90', 1299.9],
        ['1.299,90', 1299.9],
        ['€ 49,00', 49],
        ['1,299', 1299],
        [129.9, 129.9],
    ])('parses price %j', (raw, expected) => {
        const html = page(ld(product({ offers: { price: raw, priceCurrency: 'EUR' } })))
        expect(extractWishFields(html, URL).price).toBe(expected)
    })

    it.each([['0'], ['free'], [0], ['-5'], ['']])('omits unreadable or non-positive price %j', raw => {
        const html = page(ld(product({ offers: { price: raw, priceCurrency: 'EUR' } })))
        const r = extractWishFields(html, URL)
        expect(r).not.toHaveProperty('price')
        expect(r).not.toHaveProperty('currency')
    })

    it('reads product:price meta tags', () => {
        const html = page(og('product:price:amount', '19,99') + og('product:price:currency', 'eur'))
        expect(extractWishFields(html, URL)).toEqual({ price: 19.99, currency: '€' })
    })

    it('reads og:price meta tags', () => {
        const html = page(og('og:price:amount', '19.99') + og('og:price:currency', 'USD'))
        expect(extractWishFields(html, URL)).toEqual({ price: 19.99, currency: '$' })
    })

    it('reads microdata itemprop price', () => {
        const html =
            '<html><body><span itemprop="price" content="35.00">35</span><meta itemprop="priceCurrency" content="GBP"></body></html>'
        expect(extractWishFields(html, URL)).toEqual({ price: 35, currency: '£' })
    })

    it('reads microdata price from text when no content attribute', () => {
        const html = '<span itemprop="price">12,50</span><span itemprop="priceCurrency">EUR</span>'
        expect(extractWishFields(html, URL)).toEqual({ price: 12.5, currency: '€' })
    })

    it('resolves relative and protocol-relative images', () => {
        expect(extractWishFields(page(og('og:image', '/img/a.jpg')), URL).imageUrl).toBe('https://shop.example.com/img/a.jpg')
        expect(extractWishFields(page(og('og:image', '//cdn.x.com/a.jpg')), URL).imageUrl).toBe('https://cdn.x.com/a.jpg')
    })

    it('drops non-http images', () => {
        expect(extractWishFields(page(og('og:image', 'javascript:alert(1)')), URL)).not.toHaveProperty('imageUrl')
        expect(extractWishFields(page(og('og:image', 'data:image/png;base64,AAAA')), URL)).not.toHaveProperty('imageUrl')
    })

    it('reads JSON-LD image as string, array or object', () => {
        const img = (image: unknown) => extractWishFields(page(ld(product({ image }))), URL).imageUrl
        expect(img('https://a.com/1.jpg')).toBe('https://a.com/1.jpg')
        expect(img(['https://a.com/2.jpg', 'https://a.com/3.jpg'])).toBe('https://a.com/2.jpg')
        expect(img({ '@type': 'ImageObject', url: 'https://a.com/4.jpg' })).toBe('https://a.com/4.jpg')
    })

    it('prefers og:image over JSON-LD image', () => {
        const html = page(ld(product({ image: 'https://a.com/ld.jpg' })) + og('og:image', 'https://a.com/og.jpg'))
        expect(extractWishFields(html, URL).imageUrl).toBe('https://a.com/og.jpg')
    })

    it('omits price and currency for unmapped currency', () => {
        const html = page(ld(product({ offers: { price: '99', priceCurrency: 'CHF' } })))
        const r = extractWishFields(html, URL)
        expect(r).not.toHaveProperty('price')
        expect(r).not.toHaveProperty('currency')
    })

    it('omits price when no currency is present', () => {
        const r = extractWishFields(page(ld(product({ offers: { price: '99' } }))), URL)
        expect(r).not.toHaveProperty('price')
        expect(r).not.toHaveProperty('currency')
    })

    it('decodes entities and collapses whitespace', () => {
        const html = page('<title>  Tom &amp; Jerry\n\n  &quot;mug&quot;  </title>')
        expect(extractWishFields(html, URL).name).toBe('Tom & Jerry "mug"')
        expect(extractWishFields(page(ld(product({ name: 'Caf&eacute;  &amp;   lampe' }))), URL).name).toBe('Café & lampe')
        expect(extractWishFields(page(og('og:description', 'a &amp; b\n  c')), URL).description).toBe('a & b c')
    })

    it('limits name to 200 and description to 5000 characters', () => {
        const html = page(og('og:title', 'n'.repeat(500)) + og('og:description', 'd'.repeat(9000)))
        const r = extractWishFields(html, URL)
        expect(r.name).toHaveLength(200)
        expect(r.description).toHaveLength(5000)
    })

    it('keeps Open Graph fields when JSON-LD is malformed', () => {
        const html = page(ld('{ not json') + og('og:title', 'OG Lamp'))
        expect(extractWishFields(html, URL)).toEqual({ name: 'OG Lamp' })
    })

    it('does not throw on an invalid page URL', () => {
        expect(extractWishFields(page(og('og:image', '/a.jpg')), 'not a url')).toEqual({})
    })
})
