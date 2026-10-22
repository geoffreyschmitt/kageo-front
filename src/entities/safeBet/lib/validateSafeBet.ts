import { isValidUrl } from '@/shared/lib/isValidUrl'

import { SAFE_BET_LIMITS, type TSafeBetInput } from '../model/safeBet.types'

type TValidation =
    | { ok: true; value: { title: string; description?: string; imageUrl?: string } }
    | { ok: false; error: 'title' | 'description' | 'imageUrl' }

const isHttpUrl = (value: string) => isValidUrl(value) && /^https?:$/.test(new URL(value).protocol)

export const validateSafeBetInput = (input: TSafeBetInput): TValidation => {
    if (typeof input.title !== 'string') return { ok: false, error: 'title' }
    const title = input.title.trim()
    if (!title || title.length > SAFE_BET_LIMITS.title) return { ok: false, error: 'title' }

    const value: { title: string; description?: string; imageUrl?: string } = { title }

    if (input.description !== undefined && input.description !== null) {
        if (typeof input.description !== 'string') return { ok: false, error: 'description' }
        const description = input.description.trim()
        if (description.length > SAFE_BET_LIMITS.description) return { ok: false, error: 'description' }
        if (description) value.description = description
    }

    if (input.imageUrl !== undefined && input.imageUrl !== null) {
        if (typeof input.imageUrl !== 'string') return { ok: false, error: 'imageUrl' }
        const imageUrl = input.imageUrl.trim()
        if (imageUrl.length > SAFE_BET_LIMITS.imageUrl || (imageUrl && !isHttpUrl(imageUrl))) {
            return { ok: false, error: 'imageUrl' }
        }
        if (imageUrl) value.imageUrl = imageUrl
    }

    return { ok: true, value }
}
