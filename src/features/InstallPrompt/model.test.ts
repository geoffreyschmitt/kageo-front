import { describe, expect, it } from 'vitest'

import { DISMISS_DAYS, isDismissed, isIosSafari, recordDismissal } from './model'

const IPHONE_SAFARI =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0 Mobile/15E148 Safari/604.1'
const IPAD_SAFARI =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
const ANDROID_CHROME =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Mobile Safari/537.36'

describe('isIosSafari', () => {
    it('detects Safari on iPhone and on iPadOS (which reports as a Mac with touch)', () => {
        expect(isIosSafari(IPHONE_SAFARI)).toBe(true)
        expect(isIosSafari(IPAD_SAFARI, 5)).toBe(true)
    })

    it('ignores a real Mac, Android, and iOS browsers that cannot show the hint', () => {
        expect(isIosSafari(IPAD_SAFARI, 0)).toBe(false)
        expect(isIosSafari(ANDROID_CHROME)).toBe(false)
        expect(isIosSafari(IPHONE_CHROME)).toBe(false)
        expect(isIosSafari(`${IPHONE_SAFARI} Instagram 300.0`)).toBe(false)
    })
})

describe('dismissal', () => {
    const memory = () => {
        const data = new Map<string, string>()
        return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
    }
    const DAY = 24 * 60 * 60 * 1000

    it('is not dismissed by default, or without storage', () => {
        expect(isDismissed(memory())).toBe(false)
        expect(isDismissed(null)).toBe(false)
    })

    it('stays dismissed for the cool-down, then comes back', () => {
        const storage = memory()
        recordDismissal(storage, 1_000_000)
        expect(isDismissed(storage, 1_000_000 + (DISMISS_DAYS - 1) * DAY)).toBe(true)
        expect(isDismissed(storage, 1_000_000 + (DISMISS_DAYS + 1) * DAY)).toBe(false)
    })

    it('treats garbage in storage as not dismissed, and survives a throwing storage', () => {
        expect(isDismissed({ getItem: () => 'nope', setItem: () => {} })).toBe(false)
        const broken = {
            getItem: () => {
                throw new Error('blocked')
            },
            setItem: () => {
                throw new Error('blocked')
            },
        }
        expect(isDismissed(broken)).toBe(false)
        expect(() => recordDismissal(broken)).not.toThrow()
    })
})
