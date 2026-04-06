'use client'

import { useState } from 'react'
import { mockUserPrivate } from '@/entities/user'
import s from './profile.module.css'

const MOCK_STATS = {
    wishlists: 7,
    wishes: 43,
    shared: 3,
}

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
    const user = mockUserPrivate

    const [nameValue, setNameValue] = useState(user.name ?? '')
    const [emailValue] = useState(user.email ?? '')
    const [nameSaved, setNameSaved] = useState(false)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordSaved, setPasswordSaved] = useState(false)

    const [notifyEmail, setNotifyEmail] = useState(true)
    const [notifyReservations, setNotifyReservations] = useState(true)
    const [publicProfile, setPublicProfile] = useState(false)

    const handleSaveName = () => {
        setNameSaved(true)
        setTimeout(() => setNameSaved(false), 2500)
    }

    const handleSavePassword = () => {
        setPasswordSaved(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setPasswordSaved(false), 2500)
    }

    const initials = getInitials(user.name)
    const memberSince = formatMemberSince(user.createdAt)

    return (
        <main className={s.profile}>
            {/* ── Hero ── */}
            <div className={s.hero}>
                <div className={s.hero__inner}>
                    <div className={s.avatar}>
                        <span className={s.avatar__monogram}>{initials}</span>
                    </div>

                    <p className={s.hero__eyebrow}>My Account</p>
                    <h1 className={s.hero__name}>{user.name ?? 'Anonymous'}</h1>
                    <p className={s.hero__email}>{user.email}</p>

                    <div className={s.hero__meta}>
                        <span className={`${s.hero__badge} ${s['hero__badge--since']}`}>
                            Member since {memberSince}
                        </span>
                    </div>

                    <div className={s.stats}>
                        <div className={s.stat}>
                            <span className={s.stat__value}>{MOCK_STATS.wishlists}</span>
                            <span className={s.stat__label}>Wishlists</span>
                        </div>
                        <div className={s.stat}>
                            <span className={s.stat__value}>{MOCK_STATS.wishes}</span>
                            <span className={s.stat__label}>Wishes</span>
                        </div>
                        <div className={s.stat}>
                            <span className={s.stat__value}>{MOCK_STATS.shared}</span>
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
                                        value={emailValue}
                                        disabled
                                        aria-describedby="email-hint"
                                    />
                                    <p id="email-hint" className={s.field__hint}>
                                        Email cannot be changed at this time.
                                    </p>
                                </div>
                            </div>
                            <div className={s.form__footer}>
                                <button
                                    className={`${s.btn} ${s['btn--primary']}`}
                                    onClick={handleSaveName}
                                >
                                    Save changes
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
                            <p className={s.section__subtitle}>Update your password to keep your account secure.</p>
                        </div>
                        {passwordSaved && <span className={s.savedDot}>Updated</span>}
                    </div>
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
                            <div className={s.form__footer}>
                                <button
                                    className={`${s.btn} ${s['btn--primary']}`}
                                    onClick={handleSavePassword}
                                    disabled={!currentPassword || !newPassword || !confirmPassword}
                                >
                                    Update password
                                </button>
                            </div>
                        </div>
                    </div>
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
                                <p className={s.preference__title}>Email notifications</p>
                                <p className={s.preference__desc}>
                                    Receive an email when someone reserves or purchases a wish.
                                </p>
                            </div>
                            <label className={s.toggle} aria-label="Toggle email notifications">
                                <input
                                    type="checkbox"
                                    className={s.toggle__input}
                                    checked={notifyEmail}
                                    onChange={(e) => setNotifyEmail(e.target.checked)}
                                />
                                <span className={s.toggle__track} />
                                <span className={s.toggle__thumb} />
                            </label>
                        </div>

                        <div className={s.preference}>
                            <div className={s.preference__text}>
                                <p className={s.preference__title}>Reservation reminders</p>
                                <p className={s.preference__desc}>
                                    Get notified when a reservation on your wishlist is about to expire.
                                </p>
                            </div>
                            <label className={s.toggle} aria-label="Toggle reservation reminders">
                                <input
                                    type="checkbox"
                                    className={s.toggle__input}
                                    checked={notifyReservations}
                                    onChange={(e) => setNotifyReservations(e.target.checked)}
                                />
                                <span className={s.toggle__track} />
                                <span className={s.toggle__thumb} />
                            </label>
                        </div>

                        <div className={s.preference}>
                            <div className={s.preference__text}>
                                <p className={s.preference__title}>Public profile</p>
                                <p className={s.preference__desc}>
                                    Allow others to find your profile and public wishlists by name.
                                </p>
                            </div>
                            <label className={s.toggle} aria-label="Toggle public profile">
                                <input
                                    type="checkbox"
                                    className={s.toggle__input}
                                    checked={publicProfile}
                                    onChange={(e) => setPublicProfile(e.target.checked)}
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
                            <button className={`${s.btn} ${s['btn--ghost']}`}>
                                Export
                            </button>
                        </div>
                        <div className={s.dangerAction}>
                            <div className={s.dangerAction__text}>
                                <p className={s.dangerAction__title}>Delete account</p>
                                <p className={s.dangerAction__desc}>
                                    Permanently delete your account and all associated data. This cannot be undone.
                                </p>
                            </div>
                            <button className={`${s.btn} ${s['btn--danger']}`}>
                                Delete account
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    )
}
