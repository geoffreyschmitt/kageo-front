'use client'

import type { ReactNode } from 'react'

import { eventBus } from '@/shared/eventBus'

type LoginCtaProps = {
    className?: string
    children: ReactNode
}

export const LoginCta = ({ className, children }: LoginCtaProps) => (
    <button
        type="button"
        className={className}
        onClick={() => eventBus.emit('auth:openLoginModal', {})}
    >
        {children}
    </button>
)
