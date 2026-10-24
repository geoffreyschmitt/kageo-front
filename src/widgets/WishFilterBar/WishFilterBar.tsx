'use client'

import {useEffect, useId, useRef, useState} from 'react'

import {useLocale, useTranslations} from 'next-intl'

import styles from './WishFilterBar.module.css'

export type TSortBy = 'name' | 'price' | 'date'
export type TSortOrder = 'asc' | 'desc'
export type TStatusView = 'all' | 'open' | 'taken'
export type TPriceRange = { min: number | null; max: number | null }

type TWishFilterBarProps = {
  // Status chips are for guests only: the owner never sees who reserved what.
  showStatus: boolean
  statusView: TStatusView
  onStatusChange: (view: TStatusView) => void
  counts: { all: number; open: number; taken: number }
  priceRange: TPriceRange
  onPriceRangeChange: (range: TPriceRange) => void
  currency: string
  sortBy: TSortBy
  sortOrder: TSortOrder
  onSortChange: (sortBy: TSortBy, sortOrder: TSortOrder) => void
  // "Showing X of Y", only when a filter hides something
  shown: number
  total: number
  isDefault: boolean
  onClear: () => void
}

// One select holds field and direction, so the current order is spelled out instead of hidden behind an arrow.
const SORT_OPTIONS = [
  {value: 'date-desc', sortBy: 'date', sortOrder: 'desc', labelKey: 'sortNewest'},
  {value: 'date-asc', sortBy: 'date', sortOrder: 'asc', labelKey: 'sortOldest'},
  {value: 'price-asc', sortBy: 'price', sortOrder: 'asc', labelKey: 'sortPriceAsc'},
  {value: 'price-desc', sortBy: 'price', sortOrder: 'desc', labelKey: 'sortPriceDesc'},
  {value: 'name-asc', sortBy: 'name', sortOrder: 'asc', labelKey: 'sortNameAsc'},
  {value: 'name-desc', sortBy: 'name', sortOrder: 'desc', labelKey: 'sortNameDesc'},
] as const

const toBound = (raw: string) => (raw === '' ? null : Number(raw))

export function WishFilterBar({
  showStatus,
  statusView,
  onStatusChange,
  counts,
  priceRange,
  onPriceRangeChange,
  currency,
  sortBy,
  sortOrder,
  onSortChange,
  shown,
  total,
  isDefault,
  onClear,
}: TWishFilterBarProps) {
  const t = useTranslations('wishlist')
  const locale = useLocale()
  const [isBudgetOpen, setIsBudgetOpen] = useState(false)
  const budgetRef = useRef<HTMLDivElement>(null)
  const budgetButtonRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()

  useEffect(() => {
    if (!isBudgetOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!budgetRef.current?.contains(e.target as Node)) setIsBudgetOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setIsBudgetOpen(false)
      budgetButtonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isBudgetOpen])

  const {min, max} = priceRange
  const hasBudget = min !== null || max !== null
  const isInverted = min !== null && max !== null && min > max
  const money = (n: number) => (locale === 'fr' ? `${n} ${currency}` : `${currency}${n}`)
  const budgetLabel = !hasBudget
    ? t('budget')
    : min !== null && max !== null
      ? t('budgetRange', {min: money(min), max: money(max)})
      : min !== null
        ? t('budgetFrom', {min: money(min)})
        : t('budgetUpTo', {max: money(max as number)})

  const sortValue = `${sortBy}-${sortOrder}`
  const isFiltered = shown !== total

  const statusChips: { view: TStatusView; label: string; count: number }[] = [
    {view: 'all', label: t('filterAll', {count: counts.all}), count: counts.all},
    {view: 'open', label: t('filterOpenToBuy', {count: counts.open}), count: counts.open},
    {view: 'taken', label: t('filterTaken', {count: counts.taken}), count: counts.taken},
  ]

  return (
    <div className={styles.bar}>
      <div className={styles.filters}>
        {showStatus && (
          <div className={styles.chips} role="group" aria-label={t('filterByStatus')}>
            {statusChips.map(({view, label, count}) => (
              <button
                key={view}
                type="button"
                className={`${styles.chip} ${statusView === view ? styles['chip--active'] : ''}`}
                aria-pressed={statusView === view}
                // A chip with nothing behind it is a dead end, unless it is the one already applied.
                disabled={count === 0 && statusView !== view}
                onClick={() => onStatusChange(view)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className={styles.budget} ref={budgetRef}>
          <div className={`${styles.budgetPill} ${hasBudget ? styles['budgetPill--active'] : ''}`}>
            <button
              ref={budgetButtonRef}
              type="button"
              className={styles.budgetButton}
              aria-expanded={isBudgetOpen}
              aria-controls={popoverId}
              onClick={() => setIsBudgetOpen((open) => !open)}
            >
              {budgetLabel}
              {!hasBudget && (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            {hasBudget && (
              <button
                type="button"
                className={styles.budgetClear}
                aria-label={t('budgetClear')}
                onClick={() => onPriceRangeChange({min: null, max: null})}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {isBudgetOpen && (
            <div className={styles.popover} id={popoverId} role="group" aria-label={t('priceRangeLabel')}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t('priceMinPlaceholder')}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className={styles.input}
                  placeholder={currency}
                  value={min ?? ''}
                  aria-invalid={isInverted}
                  autoFocus
                  onChange={(e) => onPriceRangeChange({min: toBound(e.target.value), max})}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t('priceMaxPlaceholder')}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className={styles.input}
                  placeholder={currency}
                  value={max ?? ''}
                  aria-invalid={isInverted}
                  onChange={(e) => onPriceRangeChange({min, max: toBound(e.target.value)})}
                />
              </label>
              {isInverted && <p className={styles.hint} role="alert">{t('budgetInverted')}</p>}
            </div>
          )}
        </div>
      </div>

      <div className={styles.meta}>
        {isFiltered && (
          <span className={styles.count} aria-live="polite">{t('resultsCount', {shown, total})}</span>
        )}
        {!isDefault && (
          <button type="button" className={styles.clear} onClick={onClear}>{t('clearFilters')}</button>
        )}
        <label className={styles.sort}>
          <span className={styles.sortLabel}>{t('sortLabel')}</span>
          <select
            className={styles.sortSelect}
            value={sortValue}
            onChange={(e) => {
              const option = SORT_OPTIONS.find((o) => o.value === e.target.value)
              if (option) onSortChange(option.sortBy, option.sortOrder)
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
