import type { TImportedFields, TImportedVariant, TImportResult } from '@/shared/lib/extractWishFields'

import { extractFirstUrl, findVersionByPrice } from './importHelpers'

export type TImportMode = 'fillEmpty' | 'replace'

export type TLinkImportStatus = 'idle' | 'loading' | 'found' | 'notFound' | 'chooseMode' | 'chooseVersion'

export type TVersionChoice = { label: string; price?: number; currency?: string }

const hasPrice = (price: number): boolean => Number.isFinite(price) && price > 0

// What pressing "Fill in for me" does with the link field's text.
export type TFillStart =
    | { kind: 'none' }
    | { kind: 'askMode' | 'run'; url: string; replaceFieldText: boolean }

export const decideFillStart = (input: { linkText: string; savedUrl?: string }): TFillStart => {
    const url = extractFirstUrl(input.linkText)
    if (!url) return { kind: 'none' }
    const replaceFieldText = input.linkText !== url
    const hasSavedLink = (input.savedUrl ?? '').trim() !== ''
    return { kind: hasSavedLink ? 'askMode' : 'run', url, replaceFieldText }
}

// What to do with the import's answer. Nothing here touches the form: the hook applies it.
export type TImportOutcome =
    | { kind: 'notFound' }
    | { kind: 'applyFields'; fields: TImportedFields; mode: TImportMode }
    | { kind: 'applyVersion'; base: TImportedFields; variant: TImportedVariant; mode: 'fillEmpty' }
    | { kind: 'ask'; base: TImportedFields; variants: TImportedVariant[]; mode: TImportMode }

export const decideImportOutcome = (
    result: TImportResult | null,
    mode: TImportMode,
    typedPrice: number,
): TImportOutcome => {
    if (!result) return { kind: 'notFound' }
    const variants = result.variants
    if (!variants || variants.length === 0) return { kind: 'applyFields', fields: result.fields, mode }

    if (mode === 'fillEmpty' && hasPrice(typedPrice)) {
        const index = findVersionByPrice(variants, typedPrice)
        if (index !== null) return { kind: 'applyVersion', base: result.fields, variant: variants[index], mode: 'fillEmpty' }
        // Not confident: product-level name, description and image only; ask nothing.
        return { kind: 'applyFields', fields: result.fields, mode: 'fillEmpty' }
    }
    return { kind: 'ask', base: result.fields, variants, mode }
}

// While a question is showing: does what the person did dismiss it?
// 'idle' = dismiss and apply nothing; 'applyBase' = apply the product-level fields to the
// empty fields, then 'found'; 'none' = keep asking.
export type TDismissal = 'none' | 'idle' | 'applyBase'

export const decideDismissal = (input: {
    status: TLinkImportStatus
    askedUrl: string
    linkText: string
    askedPrice: number // the form's price when the question appeared
    price: number
}): TDismissal => {
    if (input.status !== 'chooseMode' && input.status !== 'chooseVersion') return 'none'
    if (input.linkText.trim() !== input.askedUrl) return 'idle'
    if (input.status === 'chooseVersion' && hasPrice(input.price) && input.price !== input.askedPrice) return 'applyBase'
    return 'none'
}

const CURRENCY_CODES: Record<string, string> = { '€': 'EUR', $: 'USD', '£': 'GBP', '¥': 'JPY' }

// A version's price in the reader's locale ("149,99 €" in French), from the form's currency symbol.
export const formatVersionPrice = (price: number, symbol: string | undefined, locale: string): string => {
    const code = symbol ? CURRENCY_CODES[symbol] : undefined
    if (!code) return `${symbol ?? ''}${price.toFixed(2)}`
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(price)
    } catch {
        return `${symbol}${price.toFixed(2)}`
    }
}

export const toVersionChoices = (variants: TImportedVariant[]): TVersionChoice[] =>
    variants.map(({ label, price, currency }) => {
        const choice: TVersionChoice = { label }
        if (price !== undefined) choice.price = price
        if (currency !== undefined) choice.currency = currency
        return choice
    })

export const isRateLimitError = (error: unknown): boolean =>
    error instanceof Error && /^API error 429/.test(error.message)
