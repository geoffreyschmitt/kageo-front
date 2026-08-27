'use client'

import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import {
    THEME_COOKIE_MAX_AGE,
    THEME_COOKIE_NAME,
    THEME_STORAGE_KEY,
    ResolvedTheme,
    ThemePreference,
    isThemePreference,
} from './constants'

type ThemeContextValue = {
    preference: ThemePreference
    setPreference: (next: ThemePreference) => void
    resolvedTheme: ResolvedTheme
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemResolved(): ResolvedTheme {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function applyAttribute(preference: ThemePreference) {
    const el = document.documentElement
    if (preference === 'system') el.removeAttribute('data-theme')
    else el.setAttribute('data-theme', preference)
}

function persist(preference: ThemePreference) {
    try {
        if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
        else localStorage.setItem(THEME_STORAGE_KEY, preference)
    } catch {
        /* private mode — session-only */
    }
    const base = `${THEME_COOKIE_NAME}=`
    if (preference === 'system') {
        document.cookie = `${base}; path=/; max-age=0; SameSite=Lax`
    } else {
        document.cookie = `${base}${preference}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`
    }
}

export function ThemeProvider({
    initialPreference,
    children,
}: {
    initialPreference: ThemePreference
    children: React.ReactNode
}) {
    const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference)
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light')

    // Adopt any localStorage value that disagrees with the cookie-derived
    // initial (the init script already fixed the attribute).
    useEffect(() => {
        setSystemTheme(systemResolved())
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY)
            const next = isThemePreference(stored) ? stored : preference
            if (next !== preference) {
                setPreferenceState(next)
                applyAttribute(next)
            }
        } catch {
            /* ignore */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Track OS scheme changes (only matters visually while on 'system',
    // but keep resolvedTheme correct for JS consumers always).
    useEffect(() => {
        const mq = window.matchMedia(DARK_QUERY)
        const onChange = () => setSystemTheme(mq.matches ? 'dark' : 'light')
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    // Cross-tab sync.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== THEME_STORAGE_KEY) return
            const next = isThemePreference(e.newValue) ? e.newValue : 'system'
            setPreferenceState(next)
            applyAttribute(next)
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next)
        applyAttribute(next)
        persist(next)
    }, [])

    const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference

    const value = useMemo(
        () => ({ preference, setPreference, resolvedTheme }),
        [preference, setPreference, resolvedTheme],
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
