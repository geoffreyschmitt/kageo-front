import type { Metadata, Viewport } from 'next'
import { Fraunces, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import '@/shared/styles/theme.css'
import '@/shared/styles/reset.css'
import '@/shared/styles/variables.css'
import '@/shared/styles/globals.css'
import { Header } from '@/widgets'

import { AuthProvider } from '@/shared/providers/AuthProvider'
import { Toaster } from '@/shared/ui'
import { routing } from '@/shared/i18n/routing'

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

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500'],
    variable: '--font-mono',
    display: 'swap',
})

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'metadata' })
    return {
        title: t('title'),
        description: t('description'),
        appleWebApp: {
            capable: true,
            statusBarStyle: 'default',
            title: 'Kageo',
        },
        formatDetection: {
            telephone: false,
        },
        icons: {
            icon: '/icons/icon-192x192.png',
            apple: '/icons/icon-192x192.png',
        },
    }
}

export const viewport: Viewport = {
    themeColor: '#0ea5e9',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params

    if (!routing.locales.includes(locale as 'fr' | 'en')) {
        notFound()
    }

    const messages = await getMessages()

    return (
        <html lang={locale} className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
            <body>
                <NextIntlClientProvider messages={messages}>
                    <AuthProvider>
                        <Header />
                        {children}
                        <Toaster />
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    )
}
