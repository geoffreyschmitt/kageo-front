import { ThemePreference } from '@/shared/theme'

export { useTheme } from '@/shared/theme'

export const THEME_OPTIONS: { value: ThemePreference; labelKey: string }[] = [
	{ value: 'system', labelKey: 'themeSystem' },
	{ value: 'light', labelKey: 'themeLight' },
	{ value: 'dark', labelKey: 'themeDark' },
]
