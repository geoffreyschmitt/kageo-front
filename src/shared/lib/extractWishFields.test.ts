import { describe, expect, it } from 'vitest'

import { extractWishData, extractWishFields, ISO_TO_SYMBOL } from './extractWishFields'

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
        expect(priced([{ price: '12.5', priceCurrency: 'GBP' }, { price: 12.5, priceCurrency: 'GBP' }])).toMatchObject({
            price: 12.5,
            currency: '£',
        })
        expect(priced({ '@type': 'AggregateOffer', lowPrice: '49', priceCurrency: 'JPY' })).toMatchObject({
            price: 49,
            currency: '¥',
        })
    })

    describe('several priced offers (variants)', () => {
        const VARIANT_URL = 'https://shop.example.com/products/phone?variant=222'
        const variants = [
            { '@type': 'Offer', url: 'https://shop.example.com/products/phone?variant=111', price: '799', priceCurrency: 'EUR' },
            { '@type': 'Offer', url: 'https://shop.example.com/products/phone?variant=222', price: '899', priceCurrency: 'EUR' },
        ]
        const run = (offers: unknown, pageUrl: string) => extractWishFields(page(ld(product({ offers }))), pageUrl)

        it('uses the offer whose url equals the pasted url', () => {
            expect(run(variants, VARIANT_URL)).toMatchObject({ price: 899, currency: '€' })
            expect(run(variants, `${VARIANT_URL}#reviews`)).toMatchObject({ price: 899, currency: '€' })
        })

        it('matches by the variant parameter when other query parameters differ', () => {
            const offers = [
                { url: '/products/phone?variant=111', price: '799', priceCurrency: 'EUR' },
                { url: '/products/phone?variant=222', price: '899', priceCurrency: 'EUR' },
            ]
            expect(run(offers, 'https://shop.example.com/products/phone?utm_source=x&variant=222')).toMatchObject({
                price: 899,
                currency: '€',
            })
        })

        it('omits price and currency when no offer matches and prices differ', () => {
            const r = run(variants, 'https://shop.example.com/products/phone')
            expect(r.price).toBeUndefined()
            expect(r.currency).toBeUndefined()
            expect(r.name).toBe('Lamp')
        })

        it('uses the price when every offer has the same price', () => {
            const same = variants.map(v => ({ ...v, price: '799' }))
            expect(run(same, 'https://shop.example.com/products/phone')).toMatchObject({ price: 799, currency: '€' })
        })

        it('a single priced offer is used as is', () => {
            expect(run([{ price: '15', priceCurrency: 'EUR', url: 'https://elsewhere.test/x' }, { name: 'no price' }], URL)).toMatchObject({
                price: 15,
                currency: '€',
            })
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

    it('uses genuinely different Unicode spaces in the thousands variants', () => {
        const nbsp = '1 299,90'
        const narrow = '1 299,90'
        expect(nbsp).not.toBe(narrow)
        expect(nbsp.charCodeAt(1)).toBe(0xa0)
        expect(narrow.charCodeAt(1)).toBe(0x202f)
    })

    it('enforces the exact name and description boundaries', () => {
        const at = (n: number, d: number) =>
            extractWishFields(page(og('og:title', 'n'.repeat(n)) + og('og:description', 'd'.repeat(d))), URL)
        expect(at(200, 5000).name).toHaveLength(200)
        expect(at(200, 5000).description).toHaveLength(5000)
        expect(at(201, 5001).name).toHaveLength(200)
        expect(at(201, 5001).description).toHaveLength(5000)
    })

    describe('price hardening', () => {
        const priceOf = (raw: unknown) =>
            extractWishFields(page(ld(product({ offers: { price: raw, priceCurrency: 'EUR' } }))), URL).price

        it.each([['1.299'], ['1.299 €'], ['12.345']])('rejects ambiguous string %j', raw => {
            expect(priceOf(raw)).toBeUndefined()
        })
        it('keeps a JS number with three decimals', () => {
            expect(priceOf(1.299)).toBe(1.299)
        })
        it.each([['1e21'], ['1E3'], ['2e5 €']])('rejects exponent %j', raw => {
            expect(priceOf(raw)).toBeUndefined()
        })
        it.each([['€-5'], ['-5 €'], ['€ -5']])('rejects negative %j', raw => {
            expect(priceOf(raw)).toBeUndefined()
        })
        it.each([['10 - 20'], ['10–20'], ['10-20 €']])('rejects range %j', raw => {
            expect(priceOf(raw)).toBeUndefined()
        })
        it('uses AggregateOffer lowPrice only when there is no different highPrice', () => {
            const agg = (extra: Record<string, unknown>) =>
                extractWishFields(page(ld(product({ offers: { '@type': 'AggregateOffer', priceCurrency: 'EUR', ...extra } }))), URL)
            expect(agg({ lowPrice: '10' }).price).toBe(10)
            expect(agg({ lowPrice: 10, highPrice: '10' }).price).toBe(10)
            expect(agg({ lowPrice: '10', highPrice: '20' }).price).toBeUndefined()
            expect(agg({ lowPrice: 799, highPrice: 1099 }).price).toBeUndefined()
        })
        it('caps at 10,000,000', () => {
            expect(priceOf('9999999')).toBe(9999999)
            expect(priceOf('10000000')).toBeUndefined()
            expect(priceOf(10_000_000)).toBeUndefined()
        })
        it('drops images longer than 2000 characters', () => {
            const long = 'https://a.com/' + 'x'.repeat(2000)
            expect(extractWishFields(page(og('og:image', long)), URL)).not.toHaveProperty('imageUrl')
            const ok = 'https://a.com/' + 'x'.repeat(1900)
            expect(extractWishFields(page(og('og:image', ok)), URL).imageUrl).toBe(ok)
        })
    })

    describe('product versions', () => {
        const PHONE = 'https://shop.example.com/products/phone'
        const offer = (extra: Record<string, unknown>) => ({ '@type': 'Offer', priceCurrency: 'EUR', ...extra })
        const data = (html: string, pageUrl = PHONE) => extractWishData(html, pageUrl)
        const twoOffers = [offer({ name: '128 GB', price: '799', sku: 'a' }), offer({ sku: 'SKU-256', price: '899' })]

        it('returns one version per offer when offers cannot be matched and prices differ', () => {
            const r = data(page(ld(product({ image: 'https://a.com/p.jpg', offers: twoOffers }))))
            expect(r.variants).toEqual([
                { label: '128 GB', name: '128 GB', price: 799, currency: '€' },
                { label: 'SKU-256', price: 899, currency: '€' },
            ])
            expect(r.fields).toEqual({ name: 'Lamp', imageUrl: 'https://a.com/p.jpg' })
        })

        it('ignores the backup price tags when versions are detected', () => {
            const html = page(
                ld(product({ offers: twoOffers })) + og('og:price:amount', '5') + og('og:price:currency', 'EUR'),
            ).replace('<body>', '<body><span itemprop="price">7</span><span itemprop="priceCurrency">EUR</span>')
            const r = data(html)
            expect(r.variants).toHaveLength(2)
            expect(r.fields.price).toBeUndefined()
            expect(r.fields.currency).toBeUndefined()
        })

        it('keeps offers without a price as unpriced versions', () => {
            const r = data(page(ld(product({ offers: [offer({ name: 'Small' }), offer({ name: 'Large' })] }))))
            expect(r.variants).toEqual([
                { label: 'Small', name: 'Small' },
                { label: 'Large', name: 'Large' },
            ])
            expect(r.fields.price).toBeUndefined()
        })

        it('keeps unpriced offers next to priced ones', () => {
            const r = data(page(ld(product({ offers: [...twoOffers, offer({ name: 'Mini' })] }))))
            expect(r.variants).toHaveLength(3)
            expect(r.variants?.[2]).toEqual({ label: 'Mini', name: 'Mini' })
        })

        it('keeps a price only with a mapped currency', () => {
            const offers = [offer({ name: 'A', price: '5', priceCurrency: 'CHF' }), offer({ name: 'B', price: '6' })]
            const r = data(page(ld(product({ offers }))))
            expect(r.variants?.[0]).toEqual({ label: 'A', name: 'A' })
            expect(r.variants?.[1]).toMatchObject({ price: 6, currency: '€' })
        })

        it('collapses duplicate versions', () => {
            const r = data(page(ld(product({ offers: [...twoOffers, ...twoOffers] }))))
            expect(r.variants).toHaveLength(2)
        })

        it('treats a single remaining version as a normal product', () => {
            const r = data(page(ld(product({ offers: [offer({ name: 'A' }), offer({ name: 'A' })] }))))
            expect(r.variants).toBeUndefined()
        })

        it('gives no variants and no price for more than 10 versions, even with backup tags', () => {
            const many = Array.from({ length: 11 }, (_, i) => offer({ name: `V${i}`, price: String(100 + i) }))
            const r = data(page(ld(product({ offers: many })) + og('og:price:amount', '5') + og('og:price:currency', 'EUR')))
            expect(r.variants).toBeUndefined()
            expect(r.fields).toEqual({ name: 'Lamp' })
        })

        it('allows exactly 10 versions', () => {
            const ten = Array.from({ length: 10 }, (_, i) => offer({ name: `V${i}`, price: String(100 + i) }))
            expect(data(page(ld(product({ offers: ten })))).variants).toHaveLength(10)
        })

        it('behaves as before for a url match, equal prices and a single priced offer', () => {
            const matched = [offer({ url: `${PHONE}?variant=1`, price: '1' }), offer({ url: `${PHONE}?variant=2`, price: '2' })]
            const r = data(page(ld(product({ offers: matched }))), `${PHONE}?variant=2`)
            expect(r.variants).toBeUndefined()
            expect(r.fields).toMatchObject({ price: 2, currency: '€' })
            const same = data(page(ld(product({ offers: [offer({ name: 'A', price: '3' }), offer({ name: 'B', price: '3' })] }))))
            expect(same.variants).toBeUndefined()
            expect(same.fields.price).toBe(3)
            const single = data(page(ld(product({ offers: offer({ name: 'A', price: '4' }) }))))
            expect(single.variants).toBeUndefined()
            expect(single.fields.price).toBe(4)
        })

        const group = (variants: unknown[]) => ({
            '@type': 'ProductGroup',
            name: 'Shirt',
            description: 'A shirt',
            hasVariant: variants,
        })

        it('reads ProductGroup hasVariant entries', () => {
            const r = data(
                page(
                    ld(
                        group([
                            {
                                '@type': 'Product',
                                name: 'Shirt S red',
                                size: 'S',
                                color: 'red',
                                image: '/s.jpg',
                                description: 'Small',
                                offers: offer({ price: '20' }),
                            },
                            { '@type': 'Product', size: 'M', color: 'blue', offers: offer({ price: '22' }) },
                            { '@type': 'Product', sku: 'L-1', offers: offer({ price: '24' }) },
                        ]),
                    ),
                ),
            )
            expect(r.fields).toEqual({ name: 'Shirt', description: 'A shirt' })
            expect(r.variants).toEqual([
                {
                    label: 'Shirt S red',
                    name: 'Shirt S red',
                    description: 'Small',
                    imageUrl: 'https://shop.example.com/s.jpg',
                    price: 20,
                    currency: '€',
                },
                { label: 'M / blue', price: 22, currency: '€' },
                { label: 'L-1', price: 24, currency: '€' },
            ])
        })

        it('treats a ProductGroup with one distinct version, or a url match, as a normal product', () => {
            const v = { '@type': 'Product', name: 'Shirt S', offers: offer({ price: '20' }) }
            const one = data(page(ld(group([v, v]))))
            expect(one.variants).toBeUndefined()
            expect(one.fields).toMatchObject({ name: 'Shirt S', price: 20 })
            const two = group([
                { ...v, url: `${PHONE}?v=1` },
                { '@type': 'Product', name: 'Shirt M', url: `${PHONE}?v=2`, offers: offer({ price: '22' }) },
            ])
            const m = data(page(ld(two)), `${PHONE}?v=2`)
            expect(m.variants).toBeUndefined()
            expect(m.fields).toMatchObject({ name: 'Shirt M', price: 22 })
        })

        it('prefers a ProductGroup over a variant Product listed before it', () => {
            const variant = { '@type': 'Product', name: 'Shirt S', offers: offer({ price: '20' }) }
            const g = group([
                { '@type': 'Product', name: 'Shirt S', offers: offer({ price: '20' }) },
                { '@type': 'Product', name: 'Shirt M', offers: offer({ price: '22' }) },
            ])
            const r = data(page(ld({ '@graph': [variant, g] })))
            expect(r.variants).toHaveLength(2)
            expect(r.fields.price).toBeUndefined()
        })

        describe('@id references and unusable members', () => {
            const refs = [{ '@id': 'https://shop.example.com/#a' }, { '@id': 'https://shop.example.com/#b' }]
            const nodes = [
                { '@type': 'Product', '@id': 'https://shop.example.com/#a', name: 'Coat S', offers: offer({ price: '39.99' }) },
                { '@type': 'Product', '@id': 'https://shop.example.com/#b', name: 'Coat L', offers: offer({ price: '59.99' }) },
            ]
            const backup = og('og:price:amount', '39.99') + og('og:price:currency', 'EUR')

            it('resolves hasVariant references to the nodes of the same graph', () => {
                const r = data(page(ld({ '@graph': [{ ...group(refs), name: 'Coat' }, ...nodes] }) + backup))
                expect(r.variants).toEqual([
                    { label: 'Coat S', name: 'Coat S', price: 39.99, currency: '€' },
                    { label: 'Coat L', name: 'Coat L', price: 59.99, currency: '€' },
                ])
                expect(r.fields.price).toBeUndefined()
            })

            it('gives no price, no variants and ignores backup tags when references cannot be resolved', () => {
                const r = data(page(ld({ '@graph': [{ ...group(refs), name: 'Coat' }] }) + backup))
                expect(r.variants).toBeUndefined()
                expect(r.fields).toEqual({ name: 'Coat', description: 'A shirt' })
            })

            it('drops members with neither label nor price, and does not guess when one real version is left', () => {
                const full = { '@type': 'Product', name: 'Small green coat', offers: offer({ price: '39.99' }) }
                const urlOnly = (n: number) => ({ '@type': 'Product', url: `${PHONE}?v=${n}` })
                const r = data(page(ld(group([full, urlOnly(1), urlOnly(2)])) + backup), `${PHONE}?utm_source=x`)
                expect(r.variants).toBeUndefined()
                expect(r.fields.price).toBeUndefined()
            })

            it('lists only the usable members when at least two remain', () => {
                const mk = (name: string, price: string) => ({ '@type': 'Product', name, offers: offer({ price }) })
                const r = data(page(ld(group([mk('A', '1'), { '@type': 'Product' }, mk('B', '2')]))))
                expect(r.variants?.map(v => v.label)).toEqual(['A', 'B'])
            })
        })

        it('applies the length limits and the http(s) image rule to variants', () => {
            const offers = [
                offer({ name: 'n'.repeat(500), description: 'd'.repeat(9000), image: 'javascript:alert(1)', price: '1' }),
                offer({ name: 'b', image: 'https://a.com/b.jpg', price: '2' }),
            ]
            const [a, b] = data(page(ld(product({ offers })))).variants ?? []
            expect(a.name).toHaveLength(200)
            expect(a.label).toHaveLength(200)
            expect(a.description).toHaveLength(5000)
            expect(a.imageUrl).toBeUndefined()
            expect(b.imageUrl).toBe('https://a.com/b.jpg')
        })

        it('keeps extractWishFields returning only the fields', () => {
            expect(extractWishFields(page(ld(product({ offers: twoOffers }))), PHONE)).toEqual({ name: 'Lamp' })
        })

        it('stays fast with thousands of offers', () => {
            const many = Array.from({ length: 5000 }, (_, i) => offer({ name: `V${i}`, price: String(i + 1) }))
            const t = performance.now()
            const r = data(page(ld(product({ offers: many }))))
            expect(performance.now() - t).toBeLessThan(1500)
            expect(r.variants).toBeUndefined()
        })
    })

    describe('hostile pages', () => {
        const head = page(og('og:title', 'Safe title') + og('og:description', 'Safe desc')).replace('</head>', '')
        const timed = (html: string) => {
            const t = performance.now()
            const r = extractWishFields(html, URL)
            return { r, ms: performance.now() - t }
        }

        it('handles 180k unclosed divs', () => {
            const { r, ms } = timed(head + '<div>'.repeat(180_000))
            expect(ms).toBeLessThan(1500)
            expect(r.name).toBe('Safe title')
        })
        it('handles 40k meta tags', () => {
            const { r, ms } = timed(head + '<meta name="x" content="y">'.repeat(40_000))
            expect(ms).toBeLessThan(1500)
            expect(r.name).toBe('Safe title')
        })
        it('handles 1 MB of "<"', () => {
            const { r, ms } = timed(head + '<'.repeat(1_000_000))
            expect(ms).toBeLessThan(1500)
            expect(r.description).toBe('Safe desc')
        })
        it('handles 1 MB of unterminated tags', () => {
            const { ms } = timed(head + '<meta a="'.repeat(110_000))
            expect(ms).toBeLessThan(1500)
        })
        it('handles an unterminated 1 MB ld+json script', () => {
            const { r, ms } = timed(head + '<script type="application/ld+json">' + '{"a":'.repeat(200_000))
            expect(ms).toBeLessThan(1500)
            expect(r.name).toBe('Safe title')
        })
        it('handles 20k malformed ld+json blocks', () => {
            const { r, ms } = timed(head + '<script type="application/ld+json">{x</script>'.repeat(20_000))
            expect(ms).toBeLessThan(1500)
            expect(r.name).toBe('Safe title')
        })
        const ogHead = page(og('og:title', 'Early title') + '<title>Early</title>').replace('</head>', '')
        const bombs: [string, string][] = [
            ['unclosed titles', '<title>'.repeat(143_000)],
            ['unclosed scripts', '<script>'.repeat(125_000)],
            ['unclosed styles', '<style>'.repeat(140_000)],
            ['unclosed comments', '<!--'.repeat(250_000)],
            ['CDATA openers', '<![CDATA['.repeat(110_000)],
            ['unterminated meta quotes', '<meta content="'.repeat(65_000)],
            ['unclosed ld+json scripts', '<script type="application/ld+json">'.repeat(30_000)],
            ['unterminated single quotes', "<a b='".repeat(160_000)],
        ]
        it.each(bombs)('is fast on %s', (_label, bomb) => {
            const alone = timed(bomb)
            expect(alone.ms).toBeLessThan(1500)
            const early = timed(ogHead + bomb)
            expect(early.ms).toBeLessThan(1500)
            expect(early.r.name).toBe('Early title')
        })

        it('handles many itemprop elements', () => {
            const { ms } = timed(head + '<span itemprop="price">x</span>'.repeat(40_000))
            expect(ms).toBeLessThan(1500)
        })
    })
})
