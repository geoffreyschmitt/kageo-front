import { HTMLElement, parse } from 'node-html-parser'

// Server-only: parses third-party HTML. Never import from client code.

export type TImportedFields = {
    name?: string
    description?: string
    imageUrl?: string
    price?: number
    currency?: string
}

export const ISO_TO_SYMBOL: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', JPY: '¥' }

const MAX_NAME = 200
const MAX_DESCRIPTION = 5000

type TJson = unknown
type TRecord = Record<string, unknown>

const isRecord = (v: unknown): v is TRecord => typeof v === 'object' && v !== null && !Array.isArray(v)

const clean = (value: unknown, max: number): string | undefined => {
    if (typeof value !== 'string') return undefined
    const text = value.replace(/\s+/g, ' ').trim().slice(0, max).trim()
    return text || undefined
}

// JSON-LD strings are not decoded by the HTML parser, so run them through it.
const decodeEntities = (value: string): string => {
    if (!value.includes('&')) return value
    try {
        return parse(`<i>${value.replace(/</g, '&lt;')}</i>`).textContent
    } catch {
        return value
    }
}

const resolveHttpUrl = (value: unknown, pageUrl: string): string | undefined => {
    if (typeof value !== 'string' || !value.trim()) return undefined
    const raw = value.trim()
    let url: URL | undefined
    try {
        url = new URL(raw, pageUrl)
    } catch {
        try {
            url = new URL(raw)
        } catch {
            return undefined
        }
    }
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
}

export const parsePrice = (value: unknown): number | undefined => {
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined
    if (typeof value !== 'string') return undefined
    const match = value.replace(/[\s  ]/g, '').match(/\d[\d.,]*/)
    if (!match || value.trim().startsWith('-')) return undefined
    const s = match[0].replace(/[.,]+$/, '')
    const lastDot = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')
    let normalized: string
    if (lastDot >= 0 && lastComma >= 0) {
        const decimal = lastDot > lastComma ? '.' : ','
        const thousands = decimal === '.' ? ',' : '.'
        normalized = s.split(thousands).join('').replace(decimal, '.')
    } else if (lastComma >= 0) {
        const parts = s.split(',')
        const isThousands = parts.length > 2 || (parts[1].length === 3 && parts[0].length <= 3 && parts[0] !== '0')
        normalized = isThousands ? parts.join('') : s.replace(',', '.')
    } else {
        // A lone "." is a decimal point (schema.org style); several are thousands separators.
        const parts = s.split('.')
        normalized = parts.length > 2 ? parts.join('') : s
    }
    const n = Number(normalized)
    return Number.isFinite(n) && n > 0 ? n : undefined
}

const toSymbol = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined
    const v = value.trim()
    if (Object.values(ISO_TO_SYMBOL).includes(v)) return v
    return ISO_TO_SYMBOL[v.toUpperCase()]
}

const rawCurrency = (value: unknown): string | undefined => {
    return typeof value === 'string' && value.trim() ? value : undefined
}

const types = (node: TRecord): string[] => {
    const t = node['@type']
    return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === 'string').map(x => x.split(/[/#:]/).pop() ?? x)
}

const collectNodes = (data: TJson, out: TRecord[], depth = 0): void => {
    if (depth > 6) return
    if (Array.isArray(data)) {
        data.forEach(d => collectNodes(d, out, depth + 1))
    } else if (isRecord(data)) {
        out.push(data)
        collectNodes(data['@graph'], out, depth + 1)
    }
}

const readJsonLdProduct = (root: HTMLElement): TRecord | undefined => {
    for (const script of root.querySelectorAll('script')) {
        const type = (script.getAttribute('type') ?? '').toLowerCase()
        if (!type.includes('ld+json')) continue
        try {
            const nodes: TRecord[] = []
            collectNodes(JSON.parse(script.rawText), nodes)
            const product = nodes.find(n => types(n).includes('Product'))
            if (product) return product
        } catch {
            // malformed block: ignore it, other sources still apply
        }
    }
    return undefined
}

const ldString = (value: unknown, max: number): string | undefined =>
    typeof value === 'string' ? clean(decodeEntities(value), max) : undefined

const ldImage = (value: unknown, pageUrl: string): string | undefined => {
    if (Array.isArray(value)) {
        for (const item of value) {
            const url = ldImage(item, pageUrl)
            if (url) return url
        }
        return undefined
    }
    if (isRecord(value)) return resolveHttpUrl(value.url ?? value.contentUrl, pageUrl)
    return resolveHttpUrl(value, pageUrl)
}

type TPriceSource = { price?: number; currency?: string }

const offerPrice = (offer: unknown, inherited?: string): TPriceSource | undefined => {
    if (!isRecord(offer)) return undefined
    const spec = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification
    const specRec = isRecord(spec) ? spec : {}
    const price = parsePrice(offer.price) ?? parsePrice(offer.lowPrice) ?? parsePrice(specRec.price)
    const currency = rawCurrency(offer.priceCurrency) ?? rawCurrency(specRec.priceCurrency) ?? inherited
    return { price, currency }
}

const ldPrice = (product: TRecord | undefined): TPriceSource | undefined => {
    if (!product) return undefined
    const offers = Array.isArray(product.offers) ? product.offers : [product.offers]
    const results = offers.map(o => {
        const own = offerPrice(o)
        if (isRecord(o) && Array.isArray(o.offers) && !own?.price) {
            const parent = rawCurrency(o.priceCurrency)
            return o.offers.map(n => offerPrice(n, parent)).find(r => r?.price)
        }
        return own
    })
    return results.find(r => r?.price) ?? results.find(r => r?.currency)
}

export const extractWishFields = (html: string, pageUrl: string): TImportedFields => {
    let root: HTMLElement
    try {
        root = parse(html)
    } catch {
        return {}
    }

    const meta = new Map<string, string>()
    for (const el of root.querySelectorAll('meta')) {
        const key = (el.getAttribute('property') ?? el.getAttribute('name') ?? '').toLowerCase()
        const content = el.getAttribute('content')
        if (key && content !== undefined && !meta.has(key)) meta.set(key, content)
    }

    const product = readJsonLdProduct(root)
    const titleTag = root.querySelector('title')?.text

    const name = ldString(product?.name, MAX_NAME) ?? clean(meta.get('og:title'), MAX_NAME) ?? clean(titleTag, MAX_NAME)
    const description =
        clean(meta.get('og:description'), MAX_DESCRIPTION) ??
        clean(meta.get('description'), MAX_DESCRIPTION) ??
        ldString(product?.description, MAX_DESCRIPTION)
    const imageUrl = resolveHttpUrl(meta.get('og:image'), pageUrl) ?? ldImage(product?.image, pageUrl)

    const itemprop = (prop: string): string | undefined => {
        const el = root.querySelector(`[itemprop="${prop}"]`)
        if (!el) return undefined
        return el.getAttribute('content') ?? el.text
    }
    const sources: TPriceSource[] = [
        ldPrice(product) ?? {},
        {
            price: parsePrice(meta.get('product:price:amount') ?? meta.get('og:price:amount')),
            currency: rawCurrency(meta.get('product:price:currency') ?? meta.get('og:price:currency')),
        },
        { price: parsePrice(itemprop('price')), currency: rawCurrency(itemprop('priceCurrency')) },
    ]
    const chosen = sources.find(s => s.price !== undefined)
    // A source may carry the price but not the currency (or vice versa): borrow it from the next one.
    const currencyRaw = chosen?.currency ?? sources.find(s => s.currency)?.currency
    const symbol = toSymbol(currencyRaw)

    const result: TImportedFields = {}
    if (name) result.name = name
    if (description) result.description = description
    if (imageUrl) result.imageUrl = imageUrl
    if (chosen?.price !== undefined && symbol) {
        result.price = chosen.price
        result.currency = symbol
    }
    return result
}
