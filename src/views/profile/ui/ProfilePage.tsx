'use client'

import { useState } from 'react'

import { useManageAccountModel } from '@/features/ManageAccount'
import { Modal } from '@/shared/ui'

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

function formatMemberSince(iso?: string): string {
    if (!iso) return 'Unknown'
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function ProfilePage() {
    const {
        profile,
        stats,
        isLoading,
        loadError,

        nameValue,
        setNameValue,
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
                        <p className={s.hero__eyebrow}>My Account</p>
                        <h1 className={s.hero__name}>Loading…</h1>
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
                        <p className={s.hero__eyebrow}>My Account</p>
                        <h1 className={s.hero__name}>Could not load your profile</h1>
                        <p className={s.hero__email}>{loadError}</p>
                    </div>
                </div>
            </main>
        )
    }

    const initials = getInitials(profile.name)
    const memberSince = formatMemberSince(profile.createdAt)

    return (
        <main className={s.profile}>
            {/* ── Hero ── */}
            <div className={s.hero}>
                <div className={s.hero__inner}>
                    <div className={s.avatar}>
                        <span className={s.avatar__monogram}>{initials}</span>
                    </div>

                    <p className={s.hero__eyebrow}>My Account</p>
                    <h1 className={s.hero__name}>{profile.name || 'Anonymous'}</h1>
                    <p className={s.hero__email}>{profile.email}</p>

                    <div className={s.hero__meta}>
                        <span className={`${s.hero__badge} ${s['hero__badge--since']}`}>
                            Member since {memberSince}
                        </span>
                    </div>

                    <div className={s.stats}>
                        <div className={s.stat}>
                            <span className={s.stat__value}>{stats?.wishlists ?? 0}</span>
                            <span className={s.stat__label}>Wishlists</span>
                        </div>
                        <div className={s.stat}>
                            <span className={s.stat__value}>{stats?.wishes ?? 0}</span>
                            <span className={s.stat__label}>Wishes</span>
                        </div>
                        <div className={s.stat}>
                            <span className={s.stat__value}>{stats?.shared ?? 0}</span>
                            <span className={s.stat__label}>Shared</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sections ── */}
            <div className={s.body}>

                {/* Account Info */}
                <div className={s.section}>
                    <div className={s.section__header}>
                        <div>
                            <h2 className={s.section__title}>Account Info</h2>
                            <p className={s.section__subtitle}>Update your name and review your email address.</p>
                        </div>
                        {nameSaved && <span className={s.savedDot}>Saved</span>}
                    </div>
                    <div className={s.section__body}>
                        <div className={s.form}>
                            <div className={s.form__row}>
                                <div className={s.field}>
                                    <label className={s.field__label} htmlFor="profile-name">
                                        Display Name
                                    </label>
                                    <input
                                        id="profile-name"
                                        className={s.field__input}
                                        type="text"
                                        value={nameValue}
                                        onChange={(e) => setNameValue(e.target.value)}
                                        placeholder="Your name"
                                    />
                                </div>
                                <div className={s.field}>
                                    <label className={s.field__label} htmlFor="profile-email">
                                        Email Address
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
                                        Email cannot be changed at this time.
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
                                    {isSavingName ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className={s.section}>
                    <div className={s.section__header}>
                        <div>
                            <h2 className={s.section__title}>Security</h2>
                            <p className={s.section__subtitle}>
                                {profile.hasPassword
                                    ? 'Update your password to keep your account secure.'
                                    : 'You signed in with Google — there is no password to update.'}
                            </p>
                        </div>
                        {passwordSaved && <span className={s.savedDot}>Updated</span>}
                    </div>
                    {profile.hasPassword && (
                        <div className={s.section__body}>
                            <div className={s.form}>
                                <div className={s.field}>
                                    <label className={s.field__label} htmlFor="current-password">
                                        Current Password
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
                                            New Password
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
                                            Confirm Password
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
                                        {isSavingPassword ? 'Updating…' : 'Update password'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preferences */}
                <div className={s.section}>
                    <div className={s.section__header}>
                        <div>
                            <h2 className={s.section__title}>Preferences</h2>
                            <p className={s.section__subtitle}>Control notifications and privacy settings.</p>
                        </div>
                    </div>
                    <div className={s.section__body}>
                        <div className={s.preference}>
                            <div className={s.preference__text}>
                                <p className={s.preference__title}>Public profile</p>
                                <p className={s.preference__desc}>
                                    Let anyone with the link view your profile page and public wishlists.
                                </p>
                                {profile.isPublic && (
                                    <a
                                        href={`/u/${profile.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={s.preference__link}
                                    >
                                        View your public profile ↗
                                    </a>
                                )}
                            </div>
                            <label className={s.toggle} aria-label="Toggle public profile">
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
                    </div>
                </div>

                {/* Danger zone */}
                <div className={`${s.section} ${s['section--danger']}`}>
                    <div className={s.section__header}>
                        <div>
                            <h2 className={s.section__title}>Danger Zone</h2>
                            <p className={s.section__subtitle}>These actions are irreversible. Proceed with care.</p>
                        </div>
                    </div>
                    <div className={s.section__body}>
                        <div className={s.dangerAction}>
                            <div className={s.dangerAction__text}>
                                <p className={s.dangerAction__title}>Export my data</p>
                                <p className={s.dangerAction__desc}>
                                    Download a copy of all your wishlists and wishes as JSON.
                                </p>
                            </div>
                            <button
                                className={`${s.btn} ${s['btn--ghost']}`}
                                onClick={handleExportData}
                                disabled={isExporting}
                            >
                                {isExporting ? 'Exporting…' : 'Export'}
                            </button>
                        </div>
                        <div className={s.dangerAction}>
                            <div className={s.dangerAction__text}>
                                <p className={s.dangerAction__title}>Delete account</p>
                                <p className={s.dangerAction__desc}>
                                    Permanently delete your account and all associated data. This cannot be undone.
                                </p>
                            </div>
                            <button
                                className={`${s.btn} ${s['btn--danger']}`}
                                onClick={() => setIsDeleteModalOpen(true)}
                            >
                                Delete account
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete your account?"
            >
                <div className={s.deleteModal}>
                    <p className={s.deleteModal__message}>
                        This permanently deletes your account, every wishlist you own, and all of their wishes.
                        This cannot be undone.
                    </p>
                    {deleteError && <p className={s.field__error}>{deleteError}</p>}
                    <div className={s.deleteModal__actions}>
                        <button
                            className={`${s.btn} ${s['btn--ghost']}`}
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            className={`${s.btn} ${s['btn--danger']}`}
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting…' : 'Yes, delete my account'}
                        </button>
                    </div>
                </div>
            </Modal>
        </main>
    )
}
