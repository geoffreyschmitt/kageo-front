export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'kageo-theme'
export const THEME_COOKIE_NAME = 'kageo-theme'
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const THEME_OPTION_VALUES: readonly ThemePreference[] = ['system', 'light', 'dark']

export function isThemePreference(value: unknown): value is ThemePreference {
    return value === 'system' || value === 'light' || value === 'dark'
}
