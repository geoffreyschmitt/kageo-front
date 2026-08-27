import { ThemePreference } from '@/shared/theme/constants'

export { useTheme } from '@/shared/theme/useTheme'

export const THEME_OPTIONS: { value: ThemePreference; labelKey: string }[] = [
	{ value: 'system', labelKey: 'themeSystem' },
	{ value: 'light', labelKey: 'themeLight' },
	{ value: 'dark', labelKey: 'themeDark' },
]
