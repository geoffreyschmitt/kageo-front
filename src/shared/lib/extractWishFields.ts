import { parse } from 'node-html-parser'

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
const MAX_IMAGE_URL = 2000
const MAX_PRICE = 10_000_000

type TJson = unknown
type TRecord = Record<string, unknown>

const isRecord = (v: unknown): v is TRecord => typeof v === 'object' && v !== null && !Array.isArray(v)

const clean = (value: unknown, max: number): string | undefined => {
    if (typeof value !== 'string') return undefined
    const text = value.replace(/\s+/g, ' ').trim().slice(0, max).trim()
    return text || undefined
}

// Strings from JSON-LD and raw tag text are not decoded yet; run them through the
// parser (tiny inputs only, '<' escaped so no markup is ever built).
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
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    const out = url.toString()
    return out.length <= MAX_IMAGE_URL ? out : undefined
}

export const parsePrice = (value: unknown): number | undefined => {
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 && value < MAX_PRICE ? value : undefined
    if (typeof value !== 'string' || value.length > 100) return undefined
    // Exponents, negatives and ranges are never a plain price.
    if (/\d\s*[eE][+-]?\s*\d/.test(value) || /[-‐-―−]/.test(value)) return undefined
    const match = value.replace(/[\s  ]/g, '').match(/\d[\d.,]*/)
    if (!match) return undefined
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
        const parts = s.split('.')
        // "1.299" is thousands in de/fr but 3 decimals elsewhere: too ambiguous to guess.
        if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3 && parts[0] !== '0') return undefined
        normalized = parts.length > 2 ? parts.join('') : s
    }
    const n = Number(normalized)
    return Number.isFinite(n) && n > 0 && n < MAX_PRICE ? n : undefined
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

// Linear single-pass scanner. We never build a DOM of the whole (untrusted) page:
// node-html-parser is quadratic on deeply nested / very wide documents.
const MAX_METAS = 500
const MAX_LD_BLOCKS = 20
const MAX_LD_BYTES = 200_000
const MAX_ITEMPROPS = 50
const MAX_TAG_LENGTH = 10_000
const MAX_WASTED_SCAN = 4_000_000
const MAX_TITLE = 2000
const MAX_ITEMPROP_TEXT = 200

type TScan = {
    title?: string
    metas: Map<string, string>
    ld: string[]
    itemprops: Map<string, string>
}

const isSpace = (c: number) => c === 32 || c === 9 || c === 10 || c === 13 || c === 12
const isAlpha = (c: number) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122)

// Case-insensitive search for an ASCII-lowercase needle, starting at `from`.
const indexOfCI = (html: string, needle: string, from: number): number => {
    const first = needle[0]
    let i = html.indexOf(first, from)
    while (i >= 0) {
        let ok = true
        for (let k = 1; k < needle.length; k++) {
            const c = html.charCodeAt(i + k)
            if ((c >= 65 && c <= 90 ? c + 32 : c) !== needle.charCodeAt(k)) {
                ok = false
                break
            }
        }
        if (ok) return i
        i = html.indexOf(first, i + 1)
    }
    return -1
}

// Index of the '>' closing the tag opened at `start`, honouring quotes; -1 if absent or too long.
type TBudget = { wasted: number; noQuote: Set<string> }

const findTagEnd = (html: string, start: number, budget: TBudget): number => {
    const limit = Math.min(html.length, start + MAX_TAG_LENGTH)
    let i = start + 1
    while (i < limit) {
        const c = html.charCodeAt(i)
        if (c === 62) return i
        if (c === 34 || c === 39) {
            const q = html[i]
            // A quote that is missing from here on is missing for every later tag too.
            if (budget.noQuote.has(q)) return -1
            const close = html.indexOf(q, i + 1)
            if (close < 0) {
                budget.noQuote.add(q)
                budget.wasted += html.length - i
                return -1
            }
            if (close >= limit) {
                budget.wasted += close - i
                return -1
            }
            i = close + 1
        } else i++
    }
    return -1
}

const parseAttrs = (tag: string, nameEnd: number): Map<string, string> => {
    const attrs = new Map<string, string>()
    let i = nameEnd
    const n = tag.length
    while (i < n) {
        while (i < n && (isSpace(tag.charCodeAt(i)) || tag[i] === '/' || tag[i] === '>')) i++
        const ns = i
        while (i < n && !isSpace(tag.charCodeAt(i)) && tag[i] !== '=' && tag[i] !== '/' && tag[i] !== '>') i++
        if (i === ns) {
            i++
            continue
        }
        const key = tag.slice(ns, i).toLowerCase()
        while (i < n && isSpace(tag.charCodeAt(i))) i++
        let value = ''
        if (tag[i] === '=') {
            i++
            while (i < n && isSpace(tag.charCodeAt(i))) i++
            if (tag[i] === '"' || tag[i] === "'") {
                const close = tag.indexOf(tag[i], i + 1)
                const end = close < 0 ? n : close
                value = tag.slice(i + 1, end)
                i = end + 1
            } else {
                const vs = i
                while (i < n && !isSpace(tag.charCodeAt(i)) && tag[i] !== '>') i++
                value = tag.slice(vs, i)
            }
        }
        if (!attrs.has(key)) attrs.set(key, value.includes('&') ? decodeEntities(value) : value)
    }
    return attrs
}

const scanHtml = (html: string): TScan => {
    const out: TScan = { metas: new Map(), ld: [], itemprops: new Map() }
    let metaCount = 0
    const budget: TBudget = { wasted: 0, noQuote: new Set() }
    let titleMissing = false
    const len = html.length
    let i = html.indexOf('<')
    while (i >= 0 && i < len - 1) {
        const c = html.charCodeAt(i + 1)
        if (c === 33) {
            // comment / doctype
            const end = html.startsWith('<!--', i) ? html.indexOf('-->', i + 4) : html.indexOf('>', i + 2)
            if (end < 0) break
            i = html.indexOf('<', end + 1)
            continue
        }
        if (!isAlpha(c)) {
            i = html.indexOf('<', i + 1)
            continue
        }
        const end = findTagEnd(html, i, budget)
        if (end < 0) {
            budget.wasted += Math.min(MAX_TAG_LENGTH, len - i)
            if (budget.wasted > MAX_WASTED_SCAN) break
            i = html.indexOf('<', i + 1)
            continue
        }
        let ne = i + 1
        while (ne < end && !isSpace(html.charCodeAt(ne)) && html[ne] !== '/') ne++
        const tagName = html.slice(i + 1, ne).toLowerCase()
        const tag = html.slice(i, end + 1)
        let next = end + 1

        if (tagName === 'script' || tagName === 'style') {
            const close = indexOfCI(html, '</' + tagName, end + 1)
            if (close < 0) break
            if (tagName === 'script' && out.ld.length < MAX_LD_BLOCKS && close - end - 1 <= MAX_LD_BYTES) {
                const type = (parseAttrs(tag, ne - i).get('type') ?? '').toLowerCase()
                if (type.includes('ld+json')) out.ld.push(html.slice(end + 1, close))
            }
            next = close + 1
        } else if (tagName === 'title') {
            if (out.title === undefined && !titleMissing) {
                const close = indexOfCI(html, '</title', end + 1)
                if (close < 0) titleMissing = true
                else {
                    out.title = decodeEntities(html.slice(end + 1, Math.min(close, end + 1 + MAX_TITLE)))
                    next = close + 1
                }
            }
        } else if (tagName === 'meta' && metaCount < MAX_METAS) {
            metaCount++
            const attrs = parseAttrs(tag, ne - i)
            const key = (attrs.get('property') ?? attrs.get('name') ?? '').toLowerCase()
            const content = attrs.get('content')
            if (key && content !== undefined && !out.metas.has(key)) out.metas.set(key, content)
        }

        if (out.itemprops.size < MAX_ITEMPROPS && indexOfCI(tag, 'itemprop', 0) >= 0) {
            const attrs = parseAttrs(tag, ne - i)
            const props = (attrs.get('itemprop') ?? '').toLowerCase().split(/\s+/)
            for (const prop of ['price', 'pricecurrency']) {
                if (!props.includes(prop) || out.itemprops.has(prop)) continue
                let value = attrs.get('content')
                if (value === undefined) {
                    const lt = html.indexOf('<', end + 1)
                    const stop = lt < 0 ? len : lt
                    value = decodeEntities(html.slice(end + 1, Math.min(stop, end + 1 + MAX_ITEMPROP_TEXT)))
                }
                out.itemprops.set(prop, value)
            }
        }
        i = html.indexOf('<', next)
    }
    return out
}

const readJsonLdProduct = (blocks: string[]): TRecord | undefined => {
    for (const block of blocks) {
        try {
            const nodes: TRecord[] = []
            collectNodes(JSON.parse(block), nodes)
            const product = nodes.find(n => types(n).some(t => t === 'Product' || t === 'ProductGroup'))
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

export type TImportedVariant = {
    label: string
    name?: string
    description?: string
    imageUrl?: string
    price?: number
    currency?: string
}

export type TImportResult = { fields: TImportedFields; variants?: TImportedVariant[] }

const MAX_VARIANTS = 10
// Beyond this many raw entries the page counts as "too many versions" without looking at them.
const MAX_RAW_VERSIONS = 200

const offerPrice = (offer: unknown, inherited?: string): TPriceSource | undefined => {
    if (!isRecord(offer)) return undefined
    const spec = Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification
    const specRec = isRecord(spec) ? spec : {}
    const price = parsePrice(offer.price) ?? parsePrice(offer.lowPrice) ?? parsePrice(specRec.price)
    const currency = rawCurrency(offer.priceCurrency) ?? rawCurrency(specRec.priceCurrency) ?? inherited
    return { price, currency }
}

type TPricedOffer = TPriceSource & { url?: string; raw?: TRecord }

const withUrl = (offer: unknown, source: TPriceSource | undefined): TPricedOffer | undefined =>
    source && {
        ...source,
        url: isRecord(offer) && typeof offer.url === 'string' ? offer.url : undefined,
        raw: isRecord(offer) ? offer : undefined,
    }

const parseUrl = (value: string, pageUrl: string): URL | undefined => {
    try {
        return new URL(value, pageUrl)
    } catch {
        return undefined
    }
}

// Does this offer's own url point at the page that was pasted (variant pages list one offer each)?
const offerIsThisPage = (offerUrl: string | undefined, pageUrl: string): boolean => {
    if (!offerUrl) return false
    const offer = parseUrl(offerUrl, pageUrl)
    const page = parseUrl(pageUrl, pageUrl)
    if (!offer || !page || offer.origin !== page.origin || offer.pathname !== page.pathname) return false
    if (offer.search === page.search) return true
    const offerVariant = offer.searchParams.get('variant')
    return offerVariant !== null && offerVariant === page.searchParams.get('variant')
}

const collectOffers = (product: TRecord): (TPricedOffer | undefined)[] => {
    const offers = Array.isArray(product.offers) ? product.offers : [product.offers]
    const results: (TPricedOffer | undefined)[] = []
    for (const o of offers) {
        const own = offerPrice(o)
        if (isRecord(o) && Array.isArray(o.offers) && !own?.price) {
            const parent = rawCurrency(o.priceCurrency)
            for (const n of o.offers) results.push(withUrl(n, offerPrice(n, parent)))
        } else {
            results.push(withUrl(o, own))
        }
    }
    return results
}

const ldPrice = (product: TRecord | undefined, pageUrl: string): TPriceSource | undefined => {
    if (!product) return undefined
    const results = collectOffers(product)
    const priced = results.filter((r): r is TPricedOffer => !!r?.price)
    if (priced.length > 1) {
        // Several variants: only trust a price that belongs to the pasted page. Wrong data is worse than none.
        const mine = priced.find(r => offerIsThisPage(r.url, pageUrl))
        if (mine) return { price: mine.price, currency: mine.currency }
        const [first] = priced
        if (priced.every(r => r.price === first.price && r.currency === first.currency)) {
            return { price: first.price, currency: first.currency }
        }
        return undefined
    }
    const single = priced[0] ?? results.find(r => r?.currency)
    return single && { price: single.price, currency: single.currency }
}

// ---- Product versions ----

const detailText = (value: unknown): string | undefined =>
    isRecord(value) ? ldString(value.name ?? value.value, MAX_NAME) : ldString(value, MAX_NAME)

const versionLabel = (rec: TRecord): string => {
    const name = ldString(rec.name, MAX_NAME)
    if (name) return name
    const details = [detailText(rec.size), detailText(rec.color)].filter((x): x is string => !!x)
    if (details.length) return details.join(' / ').slice(0, MAX_NAME)
    return ldString(rec.sku, MAX_NAME) ?? ''
}

const buildVariant = (rec: TRecord, source: TPriceSource | undefined, pageUrl: string): TImportedVariant => {
    const variant: TImportedVariant = { label: versionLabel(rec) }
    const name = ldString(rec.name, MAX_NAME)
    const description = ldString(rec.description, MAX_DESCRIPTION)
    const imageUrl = ldImage(rec.image, pageUrl)
    const symbol = toSymbol(source?.currency)
    if (name) variant.name = name
    if (description) variant.description = description
    if (imageUrl) variant.imageUrl = imageUrl
    if (source?.price !== undefined && symbol) {
        variant.price = source.price
        variant.currency = symbol
    }
    return variant
}

type TVersions =
    | { kind: 'list'; variants: TImportedVariant[] }
    | { kind: 'tooMany' }
    // Boils down to one product: used like a plain Product.
    | { kind: 'single'; record: TRecord }

// De-duplicate by (label, price, currency), then apply the cap.
const settle = (entries: { variant: TImportedVariant; record: TRecord }[]): TVersions | undefined => {
    const seen = new Set<string>()
    const distinct = entries.filter(({ variant: v }) => {
        const key = JSON.stringify([v.label, v.price ?? null, v.currency ?? null])
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
    if (distinct.length > MAX_VARIANTS) return { kind: 'tooMany' }
    if (distinct.length < 2) return distinct[0] ? { kind: 'single', record: distinct[0].record } : undefined
    return { kind: 'list', variants: distinct.map(d => d.variant) }
}

// Offers of a Product that the pasted url cannot single out.
const offerVersions = (product: TRecord, pageUrl: string): TVersions | undefined => {
    const results = collectOffers(product).filter((r): r is TPricedOffer & { raw: TRecord } => !!r?.raw)
    if (results.length < 2) return undefined
    const priced = results.filter(r => !!r.price)
    if (priced.length === 1) return undefined
    if (priced.length > 1) {
        if (priced.some(r => offerIsThisPage(r.url, pageUrl))) return undefined
        const [first] = priced
        if (priced.every(r => r.price === first.price && r.currency === first.currency)) return undefined
    }
    if (results.length > MAX_RAW_VERSIONS) return { kind: 'tooMany' }
    const settled = settle(results.map(r => ({ variant: buildVariant(r.raw, r, pageUrl), record: r.raw })))
    // One distinct version is just the product as today.
    return settled?.kind === 'single' ? undefined : settled
}

const groupVersions = (group: TRecord, pageUrl: string): TVersions | undefined => {
    const members = (group.hasVariant as unknown[]).filter(isRecord)
    if (members.length === 0) return undefined
    const matching = members.find(m => typeof m.url === 'string' && offerIsThisPage(m.url, pageUrl))
    if (matching) return { kind: 'single', record: matching }
    if (members.length > MAX_RAW_VERSIONS) return { kind: 'tooMany' }
    return settle(members.map(m => ({ variant: buildVariant(m, ldPrice(m, pageUrl), pageUrl), record: m })))
}

const extract = (html: string, pageUrl: string): TImportResult => {
    const scan = scanHtml(html)
    const meta = scan.metas
    let product = readJsonLdProduct(scan.ld)

    let variants: TImportedVariant[] | undefined
    let versioned = false
    if (product) {
        const versions = Array.isArray(product.hasVariant) ? groupVersions(product, pageUrl) : offerVersions(product, pageUrl)
        if (versions?.kind === 'list') {
            variants = versions.variants
            versioned = true
        } else if (versions?.kind === 'tooMany') {
            versioned = true
        } else if (versions?.kind === 'single') {
            // The group's own data stays as the fallback for what the one version lacks.
            const rec = versions.record
            product = {
                ...product,
                name: rec.name ?? product.name,
                description: rec.description ?? product.description,
                image: rec.image ?? product.image,
                offers: rec.offers,
                hasVariant: undefined,
            }
        } else if (Array.isArray(product.hasVariant)) {
            product = { ...product, hasVariant: undefined }
        }
    }

    const name = ldString(product?.name, MAX_NAME) ?? clean(meta.get('og:title'), MAX_NAME) ?? clean(scan.title, MAX_NAME)
    const description =
        clean(meta.get('og:description'), MAX_DESCRIPTION) ??
        clean(meta.get('description'), MAX_DESCRIPTION) ??
        ldString(product?.description, MAX_DESCRIPTION)
    const imageUrl = resolveHttpUrl(meta.get('og:image'), pageUrl) ?? ldImage(product?.image, pageUrl)

    // With several versions the backup tags usually describe only the default one: never use them.
    const sources: TPriceSource[] = versioned
        ? []
        : [
              ldPrice(product, pageUrl) ?? {},
              {
                  price: parsePrice(meta.get('product:price:amount') ?? meta.get('og:price:amount')),
                  currency: rawCurrency(meta.get('product:price:currency') ?? meta.get('og:price:currency')),
              },
              { price: parsePrice(scan.itemprops.get('price')), currency: rawCurrency(scan.itemprops.get('pricecurrency')) },
          ]
    const chosen = sources.find(s => s.price !== undefined)
    // A source may carry the price but not the currency (or vice versa): borrow it from the next one.
    const currencyRaw = chosen?.currency ?? sources.find(s => s.currency)?.currency
    const symbol = toSymbol(currencyRaw)

    const fields: TImportedFields = {}
    if (name) fields.name = name
    if (description) fields.description = description
    if (imageUrl) fields.imageUrl = imageUrl
    if (chosen?.price !== undefined && symbol) {
        fields.price = chosen.price
        fields.currency = symbol
    }
    return variants?.length ? { fields, variants } : { fields }
}

export const extractWishData = (html: string, pageUrl: string): TImportResult => {
    try {
        return extract(html, pageUrl)
    } catch {
        return { fields: {} }
    }
}

export const extractWishFields = (html: string, pageUrl: string): TImportedFields => extractWishData(html, pageUrl).fields
