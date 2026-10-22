import type { TImportedFields, TImportedVariant } from '@/shared/lib/extractWishFields'

import { applyImport, type TFormPatch, type TImportableForm } from './applyImport'

const MAX_SCANNED_TEXT = 10_000
const MAX_URL_LENGTH = 2048
const STRIP_TRAILING = '.,!?;:…'
const URL_STOPPERS = '<>"\'»”’›'
const PICTOGRAPH = /\p{Extended_Pictographic}/u

// First http(s) link found in pasted text (phone share text), or null. Linear time: the
// text is capped and scanned character by character, never with a backtracking pattern.
export const extractFirstUrl = (text: string): string | null => {
    const head = text.slice(0, MAX_SCANNED_TEXT)
    const start = head.search(/https?:\/\//i)
    if (start === -1) return null

    let end = start
    for (const char of head.slice(start)) {
        if (/\s/.test(char) || URL_STOPPERS.includes(char) || PICTOGRAPH.test(char)) break
        end += char.length
        if (end - start > MAX_URL_LENGTH) return null
    }

    let url = head.slice(start, end)
    let opens = 0
    let closes = 0
    for (const char of url) {
        if (char === '(') opens++
        else if (char === ')') closes++
    }
    while (url.length > 0) {
        const last = url[url.length - 1]
        if (STRIP_TRAILING.includes(last)) {
            url = url.slice(0, -1)
        } else if (last === ')' && closes > opens) {
            url = url.slice(0, -1)
            closes--
        } else {
            break
        }
    }
    return /^https?:\/\/./i.test(url) ? url : null
}

// Index of the priced version closest to the typed price, only when the match is confident.
export const findVersionByPrice = (variants: TImportedVariant[], typedPrice: number): number | null => {
    if (!Number.isFinite(typedPrice) || typedPrice <= 0) return null
    const priced = variants
        .map((variant, index) => ({ index, price: variant.price }))
        .filter(
            (entry): entry is { index: number; price: number } =>
                typeof entry.price === 'number' && Number.isFinite(entry.price) && entry.price > 0,
        )
        .map(entry => ({ index: entry.index, diff: Math.abs(entry.price - typedPrice) }))
        .sort((a, b) => a.diff - b.diff)
    const best = priced[0]
    if (!best) return null
    if (best.diff > Math.max(1, typedPrice * 0.01)) return null
    const next = priced[1]
    if (next && next.diff <= best.diff) return null
    return best.index
}

const nonEmpty = (value: string | undefined): string | undefined =>
    value !== undefined && value.trim() !== '' ? value : undefined

// The version's data laid over the product-level data.
export const composeVariantFields = (base: TImportedFields, variant: TImportedVariant): TImportedFields => {
    const productName = nonEmpty(base.name)
    const versionName = nonEmpty(variant.name)
    let name: string | undefined
    if (versionName && productName) {
        name = versionName.toLowerCase().includes(productName.toLowerCase())
            ? versionName
            : `${productName} ${versionName}`
    } else {
        name = versionName ?? productName
    }

    let description = nonEmpty(variant.description) ?? nonEmpty(base.description)
    const label = variant.label.trim()
    if (label) {
        const needle = label.toLowerCase()
        const contained = (name ?? '').toLowerCase().includes(needle) || (description ?? '').toLowerCase().includes(needle)
        if (!contained) description = description ? `${label}\n\n${description}` : label
    }

    const fields: TImportedFields = {}
    if (name) fields.name = name
    if (description) fields.description = description
    const imageUrl = nonEmpty(variant.imageUrl) ?? nonEmpty(base.imageUrl)
    if (imageUrl) fields.imageUrl = imageUrl
    if (variant.price !== undefined) {
        fields.price = variant.price
        if (variant.currency) fields.currency = variant.currency
    }
    return fields
}

export const applyVersion = (
    current: TImportableForm,
    base: TImportedFields,
    variant: TImportedVariant,
    mode: 'fillEmpty' | 'replace',
): TFormPatch => applyImport(current, composeVariantFields(base, variant), mode)
