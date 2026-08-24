'use client'

import { useCallback, useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'

import {
    getProfile,
    updateProfile,
    changePassword as changePasswordApi,
    getStats,
    deleteAccount as deleteAccountApi,
    exportData as exportDataApi,
    TUserProfile,
    TUserStats,
} from '@/shared/api/user'

export const useManageAccountModel = () => {
    const { update: updateSession } = useSession()

    const [profile, setProfile] = useState<TUserProfile | null>(null)
    const [stats, setStats] = useState<TUserStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [nameValue, setNameValue] = useState('')
    const [isSavingName, setIsSavingName] = useState(false)
    const [nameSaved, setNameSaved] = useState(false)
    const [nameError, setNameError] = useState<string | null>(null)

    const [isTogglingPublic, setIsTogglingPublic] = useState(false)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSavingPassword, setIsSavingPassword] = useState(false)
    const [passwordSaved, setPasswordSaved] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)

    const [isExporting, setIsExporting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        Promise.all([getProfile(), getStats()])
            .then(([profileData, statsData]) => {
                if (cancelled) return
                setProfile(profileData)
                setNameValue(profileData.name)
                setStats(statsData)
            })
            .catch((err) => {
                if (cancelled) return
                setLoadError(err instanceof Error ? err.message : 'Failed to load profile')
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [])

    const handleSaveName = useCallback(async () => {
        if (!nameValue.trim()) {
            setNameError('Name is required')
            return
        }
        setIsSavingName(true)
        setNameError(null)
        try {
            const updated = await updateProfile({ name: nameValue.trim() })
            setProfile(updated)
            await updateSession({ name: updated.name })
            setNameSaved(true)
            setTimeout(() => setNameSaved(false), 2500)
        } catch (err) {
            setNameError(err instanceof Error ? err.message : 'Could not save name')
        } finally {
            setIsSavingName(false)
        }
    }, [nameValue, updateSession])

    const handleTogglePublicProfile = useCallback(async (next: boolean) => {
        if (!profile) return
        const previous = profile.isPublic
        setProfile({ ...profile, isPublic: next })
        setIsTogglingPublic(true)
        try {
            const updated = await updateProfile({ isPublic: next })
            setProfile(updated)
        } catch {
            setProfile((prev) => (prev ? { ...prev, isPublic: previous } : prev))
        } finally {
            setIsTogglingPublic(false)
        }
    }, [profile])

    const handleSavePassword = useCallback(async () => {
        setPasswordError(null)

        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match')
            return
        }

        setIsSavingPassword(true)
        try {
            await changePasswordApi(currentPassword, newPassword)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setPasswordSaved(true)
            setTimeout(() => setPasswordSaved(false), 2500)
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Could not update password')
        } finally {
            setIsSavingPassword(false)
        }
    }, [currentPassword, newPassword, confirmPassword])

    const handleExportData = useCallback(async () => {
        setIsExporting(true)
        try {
            await exportDataApi()
        } catch {
            // best-effort — no UI feedback channel for a file download
        } finally {
            setIsExporting(false)
        }
    }, [])

    const handleDeleteAccount = useCallback(async () => {
        setIsDeleting(true)
        setDeleteError(null)
        try {
            await deleteAccountApi()
            await signOut({ callbackUrl: '/' })
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Could not delete account')
            setIsDeleting(false)
        }
    }, [])

    return {
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
    }
}
