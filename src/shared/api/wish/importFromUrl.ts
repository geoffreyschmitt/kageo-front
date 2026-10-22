import type { TImportResult } from '@/shared/lib/extractWishFields'

import { assertOk } from '../assertOk'

// Resolves with the fields (and product versions, if any) found on the page, or null when
// nothing was found. Throws on failure (a 429 also raises the app-wide rate-limit notice).
export const importWishFromUrl = async (url: string, signal?: AbortSignal): Promise<TImportResult | null> => {
    const res = await fetch('/api/wish/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal,
    })

    await assertOk(res)

    const data = (await res.json()) as { found: boolean } & Partial<TImportResult>
    if (!data.found || !data.fields) return null
    return data.variants?.length ? { fields: data.fields, variants: data.variants } : { fields: data.fields }
}
