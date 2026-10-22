'use client'

import { useEffect, useState, type FormEvent } from 'react'

import { useTranslations } from 'next-intl'

import { SAFE_BET_LIMITS, validateSafeBetInput, type TSafeBet } from '@/entities/safeBet'

import { Panel } from '@/shared/ui'

import { useManageSafeBetsModel } from '../model'

import s from './ManageSafeBets.module.css'

type TDraft = { title: string; description: string; imageUrl: string }
type TFormProps = {
    initial: TDraft
    submitLabel: string
    onSubmit: (draft: TDraft) => Promise<void>
    onCancel: () => void
}

const EMPTY: TDraft = { title: '', description: '', imageUrl: '' }

const SafeBetForm = ({ initial, submitLabel, onSubmit, onCancel }: TFormProps) => {
    const t = useTranslations('safeBets')
    const [draft, setDraft] = useState<TDraft>(initial)
    const [fieldError, setFieldError] = useState<'title' | 'description' | 'imageUrl' | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [imgError, setImgError] = useState(false)
    useEffect(() => setImgError(false), [draft.imageUrl])

    const set = (key: keyof TDraft, value: string) => setDraft((d) => ({ ...d, [key]: value }))

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const result = validateSafeBetInput(draft)
        if (!result.ok) {
            setFieldError(result.error)
            return
        }
        setFieldError(null)
        setIsSaving(true)
        try {
            await onSubmit(draft)
        } catch {
            // the model surfaces the error; keep the form open
        } finally {
            setIsSaving(false)
        }
    }

    const previewUrl = draft.imageUrl.trim()
    const canPreview = previewUrl && validateSafeBetInput({ title: 'x', imageUrl: previewUrl }).ok

    return (
        <form className={s.form} onSubmit={handleSubmit} noValidate>
            <label className={s.field}>
                <span className={s.label}>{t('titleLabel')}</span>
                <input
                    className={s.input}
                    value={draft.title}
                    maxLength={SAFE_BET_LIMITS.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder={t('titlePlaceholder')}
                    aria-invalid={fieldError === 'title'}
                />
                {fieldError === 'title' && <small className={s.error}>{t('errors.title')}</small>}
            </label>
            <label className={s.field}>
                <span className={s.label}>{t('descriptionLabel')}</span>
                <textarea
                    className={`${s.input} ${s.textarea}`}
                    value={draft.description}
                    maxLength={SAFE_BET_LIMITS.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={3}
                    aria-invalid={fieldError === 'description'}
                />
                {fieldError === 'description' && <small className={s.error}>{t('errors.description')}</small>}
            </label>
            <label className={s.field}>
                <span className={s.label}>{t('imageLabel')}</span>
                <input
                    className={s.input}
                    type="url"
                    inputMode="url"
                    value={draft.imageUrl}
                    maxLength={SAFE_BET_LIMITS.imageUrl}
                    onChange={(e) => set('imageUrl', e.target.value)}
                    placeholder="https://"
                    aria-invalid={fieldError === 'imageUrl'}
                />
                {fieldError === 'imageUrl' && <small className={s.error}>{t('errors.imageUrl')}</small>}
            </label>
            {canPreview && (
                <div className={s.preview}>
                    {imgError ? (
                        <small className={s.error}>{t('imageLoadError')}</small>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host, preview only
                        <img src={previewUrl} alt={t('previewAlt')} className={s.previewImg} onError={() => setImgError(true)} />
                    )}
                </div>
            )}
            <div className={s.formActions}>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={isSaving}>
                    {isSaving ? t('saving') : submitLabel}
                </button>
                <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onCancel} disabled={isSaving}>
                    {t('cancel')}
                </button>
            </div>
        </form>
    )
}

const toDraft = (e: TSafeBet): TDraft => ({
    title: e.title,
    description: e.description ?? '',
    imageUrl: e.imageUrl ?? '',
})

export const ManageSafeBets = () => {
    const t = useTranslations('safeBets')
    const { entries, isLoading, error, add, update, remove, move } = useManageSafeBetsModel()
    const [mode, setMode] = useState<'idle' | 'add' | { editId: string }>('idle')
    const [confirmId, setConfirmId] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    // Failures are already surfaced via the model's error.
    const guard = async (fn: () => Promise<void>) => {
        setBusy(true)
        try {
            await fn()
        } catch {
            // surfaced by the model
        } finally {
            setBusy(false)
        }
    }

    const atLimit = entries.length >= SAFE_BET_LIMITS.maxEntries

    return (
        <Panel title={t('title')} subtitle={t('subtitle')}>
            <p className={s.hint}>{t('hint')}</p>

            {error && (
                <p className={s.errorBanner} role="alert">
                    {error}
                </p>
            )}

            {isLoading ? (
                <p className={s.muted}>{t('loading')}</p>
            ) : (
                <>
                    {entries.length === 0 && mode !== 'add' && <p className={s.muted}>{t('empty')}</p>}

                    <ul className={s.list}>
                        {entries.map((entry, i) => {
                            const isEditing = typeof mode === 'object' && mode.editId === entry.id
                            return (
                                <li key={entry.id} className={s.item}>
                                    {isEditing ? (
                                        <SafeBetForm
                                            initial={toDraft(entry)}
                                            submitLabel={t('save')}
                                            onSubmit={async (d) => {
                                                await update(entry.id, d)
                                                setMode('idle')
                                            }}
                                            onCancel={() => setMode('idle')}
                                        />
                                    ) : (
                                        <>
                                            <div className={s.itemMain}>
                                                {entry.imageUrl && (
                                                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host
                                                    <img src={entry.imageUrl} alt="" className={s.thumb} loading="lazy" />
                                                )}
                                                <div className={s.itemText}>
                                                    <p className={s.itemTitle}>{entry.title}</p>
                                                    {entry.description && <p className={s.itemDesc}>{entry.description}</p>}
                                                </div>
                                            </div>
                                            {confirmId === entry.id ? (
                                                <div className={s.actions}>
                                                    <span className={s.confirmText}>{t('confirmDelete')}</span>
                                                    <button
                                                        className={`${s.btn} ${s.btnDanger}`}
                                                        disabled={busy}
                                                        onClick={() =>
                                                            guard(async () => {
                                                                await remove(entry.id)
                                                                setConfirmId(null)
                                                            })
                                                        }
                                                    >
                                                        {t('delete')}
                                                    </button>
                                                    <button className={`${s.btn} ${s.btnGhost}`} onClick={() => setConfirmId(null)}>
                                                        {t('cancel')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={s.actions}>
                                                    <button
                                                        className={`${s.btn} ${s.btnIcon}`}
                                                        aria-label={t('moveUp')}
                                                        disabled={busy || i === 0}
                                                        onClick={() => guard(() => move(entry.id, -1))}
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        className={`${s.btn} ${s.btnIcon}`}
                                                        aria-label={t('moveDown')}
                                                        disabled={busy || i === entries.length - 1}
                                                        onClick={() => guard(() => move(entry.id, 1))}
                                                    >
                                                        ↓
                                                    </button>
                                                    <button
                                                        className={`${s.btn} ${s.btnGhost}`}
                                                        disabled={busy}
                                                        onClick={() => setMode({ editId: entry.id })}
                                                    >
                                                        {t('edit')}
                                                    </button>
                                                    <button
                                                        className={`${s.btn} ${s.btnGhost}`}
                                                        disabled={busy}
                                                        onClick={() => setConfirmId(entry.id)}
                                                    >
                                                        {t('delete')}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </li>
                            )
                        })}
                    </ul>

                    {mode === 'add' ? (
                        <SafeBetForm
                            initial={EMPTY}
                            submitLabel={t('add')}
                            onSubmit={async (d) => {
                                await add(d)
                                setMode('idle')
                            }}
                            onCancel={() => setMode('idle')}
                        />
                    ) : atLimit ? (
                        <p className={s.muted}>{t('limitReached', { max: SAFE_BET_LIMITS.maxEntries })}</p>
                    ) : (
                        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setMode('add')}>
                            {t('addIdea')}
                        </button>
                    )}
                </>
            )}
        </Panel>
    )
}
