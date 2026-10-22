import type { TImportedFields } from '@/shared/lib/extractWishFields'

import { assertOk } from '../assertOk'

// Resolves with the fields found on the page, or null when nothing was found.
// Throws on failure (a 429 also raises the app-wide rate-limit notice).
export const importWishFromUrl = async (url: string, signal?: AbortSignal): Promise<TImportedFields | null> => {
    const res = await fetch('/api/wish/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal,
    })

    await assertOk(res)

    const data = (await res.json()) as { found: boolean; fields: TImportedFields }
    return data.found ? data.fields : null
}
