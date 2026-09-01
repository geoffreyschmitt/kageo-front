'use client'

import { useState } from 'react'

import { useLocale, useTranslations } from 'next-intl'

import { useManageAccountModel } from '@/features/ManageAccount'
import { ThemeToggle } from '@/features/ThemeToggle'
import { Modal, Panel } from '@/shared/ui'

import s from './profile.module.css'

function getInitials(name: string | null): string {
    if (!name) return '?'
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

function formatMemberSince(iso: string, locale: string): string {
    return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export default function ProfilePage() {
    const t = useTranslations('profile')
    const locale = useLocale()
    const {
        profile,
        stats,
        isLoading,
        loadError,

        nameValue,
        setNameValue,
        birthdateValue,
        setBirthdateValue,
        isSavingName,
        nameSaved,
        nameError,
        handleSaveName,

        isTogglingPublic,
        handleTogglePublicProfile,

        currentPassword,
        setCurrentPassword,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        isSavingPassword,
        passwordSaved,
        passwordError,
        handleSavePassword,

        isExporting,
        handleExportData,

        isDeleting,
        deleteError,
        handleDeleteAccount,
    } = useManageAccountModel()

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

    if (isLoading) {
        return (
            <main className={s.profile}>
                <div className={s.hero}>
                    <div className={s.hero__inner}>
                        <p className={s.hero__eyebrow}>{t('myAccount')}</p>
                        <h1 className={s.hero__name}>{t('loading')}</h1>
                    </div>
                </div>
            </main>
        )
    }

    if (loadError || !profile) {
        return (
            <main className={s.profile}>
                <div className={s.hero}>
                    <div className={s.hero__inner}>
                        <p className={s.hero__eyebrow}>{t('myAccount')}</p>
                        <h1 className={s.hero__name}>{t('loadError')}</h1>
                        <p className={s.hero__email}>{loadError}</p>
                    </div>
                </div>
            </main>
        )
    }

    const initials = getInitials(profile.name)
    const memberSince = formatMemberSince(profile.createdAt, locale)

    return (
        <main className={s.profile}>
            {/* ── Hero ── */}
            <div className={s.hero}>
                <div className={s.hero__inner}>
                    <div className={s.avatar}>
                        <span className={s.avatar__monogram}>{initials}</span>
                    </div>

                    <p className={s.hero__eyebrow}>{t('myAccount')}</p>
                    <h1 className={s.hero__name}>{profile.name || t('anonymous')}</h1>
                    <p className={s.hero__email}>{profile.email}</p>

                    <div className={s.hero__meta}>
                        <span className={`${s.hero__badge} ${s['hero__badge--since']}`}>
                            {t('memberSince', { date: memberSince })}
                        </span>
                    </div>

                    <div className={s.stats}>
                        <div className={s.stat}>
                            <span className={s.stat__value}>{stats?.wishlists ?? 0}</span>
                            <span className={s.stat__label}>{t('wishlists')}</span>
                        </div>
                        <div className={s.stat}>
                            <span className={s.stat__value}>{stats?.wishes ?? 0}</span>
                            <span className={s.stat__label}>{t('wishes')}</span>
                        </div>
                        <div className={s.stat}>
                            <span className={s.stat__value}>{stats?.shared ?? 0}</span>
                            <span className={s.stat__label}>{t('shared')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sections ── */}
            <div className={s.body}>

                {/* Account Info */}
                <Panel
                    title={t('accountInfoTitle')}
                    subtitle={t('accountInfoSubtitle')}
                    actions={nameSaved && <span className={s.savedDot}>{t('saved')}</span>}
                >
                    <div className={s.form}>
                        <div className={s.form__row}>
                            <div className={s.field}>
                                <label className={s.field__label} htmlFor="profile-name">
                                    {t('displayName')}
                                </label>
                                <input
                                    id="profile-name"
                                    className={s.field__input}
                                    type="text"
                                    value={nameValue}
                                    onChange={(e) => setNameValue(e.target.value)}
                                    placeholder={t('namePlaceholder')}
                                />
                            </div>
                            <div className={s.field}>
                                <label className={s.field__label} htmlFor="profile-email">
                                    {t('emailAddress')}
                                </label>
                                <input
                                    id="profile-email"
                                    className={s.field__input}
                                    type="email"
                                    value={profile.email}
                                    disabled
                                    aria-describedby="email-hint"
                                />
                                <p id="email-hint" className={s.field__hint}>
                                    {t('emailHint')}
                                </p>
                            </div>
                        </div>
                        <div className={s.form__row}>
                            <div className={s.field}>
                                <label className={s.field__label} htmlFor="profile-birthdate">
                                    {t('birthdate')}
                                </label>
                                <input
                                    id="profile-birthdate"
                                    className={s.field__input}
                                    type="date"
                                    value={birthdateValue}
                                    max={new Date().toISOString().slice(0, 10)}
                                    onChange={(e) => setBirthdateValue(e.target.value)}
                                    aria-describedby="birthdate-hint"
                                />
                                <p id="birthdate-hint" className={s.field__hint}>
                                    {t('birthdateHint')}
                                </p>
                            </div>
                        </div>
                        {nameError && <p className={s.field__error}>{nameError}</p>}
                        <div className={s.form__footer}>
                            <button
                                className={`${s.btn} ${s['btn--primary']}`}
                                onClick={handleSaveName}
                                disabled={isSavingName}
                            >
                                {isSavingName ? t('saving') : t('saveChanges')}
                            </button>
                        </div>
                    </div>
                </Panel>

                {/* Security */}
                <Panel
                    title={t('securityTitle')}
                    subtitle={profile.hasPassword ? t('securitySubtitle') : t('securitySubtitleGoogle')}
                    actions={passwordSaved && <span className={s.savedDot}>{t('updated')}</span>}
                >
                    {profile.hasPassword && (
                        <div className={s.form}>
                            <div className={s.field}>
                                <label className={s.field__label} htmlFor="current-password">
                                    {t('currentPassword')}
                                </label>
                                <input
                                    id="current-password"
                                    className={s.field__input}
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className={s.form__row}>
                                <div className={s.field}>
                                    <label className={s.field__label} htmlFor="new-password">
                                        {t('newPassword')}
                                    </label>
                                    <input
                                        id="new-password"
                                        className={s.field__input}
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div className={s.field}>
                                    <label className={s.field__label} htmlFor="confirm-password">
                                        {t('confirmPassword')}
                                    </label>
                                    <input
                                        id="confirm-password"
                                        className={s.field__input}
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                            {passwordError && <p className={s.field__error}>{passwordError}</p>}
                            <div className={s.form__footer}>
                                <button
                                    className={`${s.btn} ${s['btn--primary']}`}
                                    onClick={handleSavePassword}
                                    disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                                >
                                    {isSavingPassword ? t('updatingPassword') : t('updatePassword')}
                                </button>
                            </div>
                        </div>
                    )}
                </Panel>

                {/* Preferences */}
                <Panel title={t('preferencesTitle')} subtitle={t('preferencesSubtitle')}>
                    <div className={s.preference}>
                        <div className={s.preference__text}>
                            <p className={s.preference__title}>{t('appearanceTitle')}</p>
                            <p className={s.preference__desc}>{t('appearanceDesc')}</p>
                        </div>
                        <ThemeToggle />
                    </div>
                    <div className={s.preference}>
                        <div className={s.preference__text}>
                            <p className={s.preference__title}>{t('publicProfile')}</p>
                            <p className={s.preference__desc}>
                                {t('publicProfileDesc')}
                            </p>
                            {profile.isPublic && (
                                <a
                                    href={`/u/${profile.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={s.preference__link}
                                >
                                    {t('viewPublicProfile')}
                                </a>
                            )}
                        </div>
                        <label className={s.toggle} aria-label={t('togglePublicProfile')}>
                            <input
                                type="checkbox"
                                className={s.toggle__input}
                                checked={profile.isPublic}
                                disabled={isTogglingPublic}
                                onChange={(e) => handleTogglePublicProfile(e.target.checked)}
                            />
                            <span className={s.toggle__track} />
                            <span className={s.toggle__thumb} />
                        </label>
                    </div>
                </Panel>

                {/* Danger zone */}
                <Panel title={t('dangerZoneTitle')} subtitle={t('dangerZoneSubtitle')} variant="danger">
                    <div className={s.dangerAction}>
                        <div className={s.dangerAction__text}>
                            <p className={s.dangerAction__title}>{t('exportTitle')}</p>
                            <p className={s.dangerAction__desc}>
                                {t('exportDesc')}
                            </p>
                        </div>
                        <button
                            className={`${s.btn} ${s['btn--ghost']}`}
                            onClick={handleExportData}
                            disabled={isExporting}
                        >
                            {isExporting ? t('exporting') : t('export')}
                        </button>
                    </div>
                    <div className={s.dangerAction}>
                        <div className={s.dangerAction__text}>
                            <p className={s.dangerAction__title}>{t('deleteAccountTitle')}</p>
                            <p className={s.dangerAction__desc}>
                                {t('deleteAccountDesc')}
                            </p>
                        </div>
                        <button
                            className={`${s.btn} ${s['btn--danger']}`}
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            {t('deleteAccount')}
                        </button>
                    </div>
                </Panel>

            </div>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title={t('deleteModalTitle')}
            >
                <div className={s.deleteModal}>
                    <p className={s.deleteModal__message}>
                        {t('deleteModalMessage')}
                    </p>
                    {deleteError && <p className={s.field__error}>{deleteError}</p>}
                    <div className={s.deleteModal__actions}>
                        <button
                            className={`${s.btn} ${s['btn--ghost']}`}
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isDeleting}
                        >
                            {t('deleteModalCancel')}
                        </button>
                        <button
                            className={`${s.btn} ${s['btn--danger']}`}
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                        >
                            {isDeleting ? t('deleting') : t('deleteModalConfirm')}
                        </button>
                    </div>
                </div>
            </Modal>
        </main>
    )
}
