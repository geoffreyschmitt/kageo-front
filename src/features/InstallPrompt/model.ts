'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

export type TInstallMode = 'native' | 'ios'

// The event Chromium fires when the app is installable; not in lib.dom yet.
export type TBeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'kageo:installPromptDismissedAt'
export const DISMISS_DAYS = 30

// iOS Safari has no install event: people add the app through the Share sheet. Other iOS
// browsers and in-app webviews either can't, or word it differently, so they get no hint.
export const isIosSafari = (userAgent: string, maxTouchPoints = 0): boolean => {
    const isIosDevice =
        /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1) // iPadOS reports as a Mac
    if (!isIosDevice) return false
    return !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\//.test(userAgent)
}

type TStorage = Pick<Storage, 'getItem' | 'setItem'>

export const isDismissed = (storage: TStorage | null, now = Date.now()): boolean => {
    try {
        const at = Number(storage?.getItem(DISMISSED_KEY))
        return Number.isFinite(at) && at > 0 && now - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
    } catch {
        return false
    }
}

export const recordDismissal = (storage: TStorage | null, now = Date.now()) => {
    try {
        storage?.setItem(DISMISSED_KEY, String(now))
    } catch {
        // Storage can be blocked (private mode); the banner just comes back next visit.
    }
}

const safeLocalStorage = (): Storage | null => {
    try {
        return window.localStorage
    } catch {
        return null
    }
}

const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true

const subscribeNothing = () => () => {}

// iOS has no install event, so eligibility is a pure read of the environment. It is false on
// the server and during hydration, then true on the client, so markup never mismatches.
const readIosEligible = () =>
    !isStandalone() && !isDismissed(safeLocalStorage()) && isIosSafari(navigator.userAgent, navigator.maxTouchPoints)

export const useInstallPrompt = () => {
    const iosEligible = useSyncExternalStore(subscribeNothing, readIosEligible, () => false)
    const [deferred, setDeferred] = useState<TBeforeInstallPromptEvent | null>(null)
    const [closed, setClosed] = useState(false)

    useEffect(() => {
        if (isStandalone() || isDismissed(safeLocalStorage())) return

        const onBeforeInstall = (event: Event) => {
            event.preventDefault() // keep the event so the banner can trigger it later
            setDeferred(event as TBeforeInstallPromptEvent)
        }
        const onInstalled = () => setClosed(true)
        window.addEventListener('beforeinstallprompt', onBeforeInstall)
        window.addEventListener('appinstalled', onInstalled)
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall)
            window.removeEventListener('appinstalled', onInstalled)
        }
    }, [])

    const dismiss = useCallback(() => {
        recordDismissal(safeLocalStorage())
        setClosed(true)
    }, [])

    const install = useCallback(async () => {
        if (!deferred) return
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        // The browser only lets an event be used once; either way the banner has done its job.
        if (outcome === 'dismissed') recordDismissal(safeLocalStorage())
        setClosed(true)
    }, [deferred])

    const mode: TInstallMode | null = closed ? null : deferred ? 'native' : iosEligible ? 'ios' : null

    return { mode, install, dismiss }
}
