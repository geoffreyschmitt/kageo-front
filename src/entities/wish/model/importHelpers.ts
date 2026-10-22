import type { TImportedFields, TImportedVariant } from '@/shared/lib/extractWishFields'

import { applyImport, type TFormPatch, type TImportableForm } from './applyImport'

const TRAILING = /[.,)!?;:]+$/

// First http(s) link found in pasted text (phone share text), or null.
export const extractFirstUrl = (text: string): string | null => {
    const match = /https?:\/\/[^\s<>"']+/i.exec(text)
    if (!match) return null
    const url = match[0].replace(TRAILING, '')
    return /^https?:\/\/./i.test(url) ? url : null
}

// Index of the priced version closest to the typed price, only when the match is confident.
export const findVersionByPrice = (variants: TImportedVariant[], typedPrice: number): number | null => {
    if (!Number.isFinite(typedPrice) || typedPrice <= 0) return null
    const priced = variants
        .map((variant, index) => ({ index, price: variant.price }))
        .filter((entry): entry is { index: number; price: number } => typeof entry.price === 'number')
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
