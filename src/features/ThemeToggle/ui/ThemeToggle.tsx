'use client'

import { useTranslations } from 'next-intl'

import { THEME_OPTIONS, useTheme } from '../model'

import s from './ThemeToggle.module.css'

export function ThemeToggle() {
	const t = useTranslations('profile')
	const { preference, setPreference } = useTheme()

	const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
		e.preventDefault()
		const i = THEME_OPTIONS.findIndex((o) => o.value === preference)
		const delta = e.key === 'ArrowRight' ? 1 : -1
		const next = THEME_OPTIONS[(i + delta + THEME_OPTIONS.length) % THEME_OPTIONS.length]
		setPreference(next.value)
	}

	return (
		<div className={s.segmented} role="group" aria-label={t('appearanceTitle')} onKeyDown={onKeyDown}>
			{THEME_OPTIONS.map((option) => {
				const active = option.value === preference
				return (
					<button
						key={option.value}
						type="button"
						className={`${s.option} ${active ? s['option--active'] : ''}`}
						aria-pressed={active}
						onClick={() => setPreference(option.value)}
					>
						{t(option.labelKey)}
					</button>
				)
			})}
		</div>
	)
}
