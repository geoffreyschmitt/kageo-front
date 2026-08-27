import 'server-only'

import { cookies } from 'next/headers'

import { THEME_COOKIE_NAME, ThemePreference } from './constants'

/** Server-only. Absent or unrecognised cookie ⇒ 'system'. */
export async function readThemeCookie(): Promise<ThemePreference> {
    const store = await cookies()
    const value = store.get(THEME_COOKIE_NAME)?.value
    return value === 'light' || value === 'dark' ? value : 'system'
}
