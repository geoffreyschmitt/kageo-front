import type { Metadata } from 'next'
import Link from 'next/link'
import { Fraunces, DM_Sans } from 'next/font/google'

import '@/shared/styles/theme.css'
import '@/shared/styles/reset.css'
import '@/shared/styles/variables.css'
import '@/shared/styles/globals.css'

import { defaultLocale } from '@/shared/i18n/config'

const fraunces = Fraunces({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    style: ['normal', 'italic'],
    variable: '--font-cormorant',
    display: 'swap',
})

const dmSans = DM_Sans({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600'],
    variable: '--font-dm-sans',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'Page introuvable — Kageo',
}

export default function GlobalNotFound() {
    return (
        <html lang={defaultLocale} className={`${fraunces.variable} ${dmSans.variable}`}>
            <body>
                <main
                    style={{
                        minHeight: '100dvh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        padding: '2rem',
                        textAlign: 'center',
                    }}
                >
                    <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.5rem', margin: 0 }}>
                        Page introuvable
                    </h1>
                    <p style={{ margin: 0, opacity: 0.7 }}>
                        Cette page n&apos;existe pas ou a été déplacée.
                    </p>
                    <Link href={`/${defaultLocale}`} style={{ textDecoration: 'underline' }}>
                        Retour à l&apos;accueil
                    </Link>
                </main>
            </body>
        </html>
    )
}
