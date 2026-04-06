'use client'

import { useState, useEffect, useCallback } from 'react'
import { eventBus } from '@/shared/eventBus'
import styles from './Toast.module.css'

type ToastItem = {
    id: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    duration: number
    exiting: boolean
}

const ICONS = {
    success: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    error: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
    ),
    warning: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 4v3M6 9h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
    ),
    info: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 5.5v3.5M6 3.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
    ),
}

export const Toaster = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
    }, [])

    useEffect(() => {
        return eventBus.on('ui:toast', (payload) => {
            const id = Math.random().toString(36).slice(2)
            const duration = payload.duration ?? 4000
            setToasts(prev => [...prev, {
                id,
                message: payload.message,
                type: payload.type ?? 'info',
                duration,
                exiting: false,
            }])
            setTimeout(() => dismiss(id), duration)
        })
    }, [dismiss])

    if (toasts.length === 0) return null

    return (
        <div className={styles.toaster} role="region" aria-label="Notifications" aria-live="polite">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`${styles.toast} ${styles[`toast--${toast.type}`]} ${toast.exiting ? styles['toast--exiting'] : ''}`}
                    onClick={() => dismiss(toast.id)}
                    role="alert"
                >
                    <div className={styles.toast__icon}>
                        {ICONS[toast.type]}
                    </div>
                    <p className={styles.toast__message}>{toast.message}</p>
                    <div
                        className={styles.toast__progress}
                        style={{ animationDuration: `${toast.duration}ms` }}
                    />
                </div>
            ))}
        </div>
    )
}
