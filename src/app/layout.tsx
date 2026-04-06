import type { Metadata, Viewport } from 'next'
import { Fraunces, DM_Sans, JetBrains_Mono } from 'next/font/google'

import '@/shared/styles/reset.css'
import '@/shared/styles/variables.css'
import '@/shared/styles/globals.css'
import { Header } from "@/widgets"

import { AuthProvider } from '@/shared/providers/AuthProvider'

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

export const metadata: Metadata = {
    title: "Kageo Wishlists",
    description: "Manage your wishlists with Kageo",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Kageo",
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: "/icons/icon-192x192.png",
        apple: "/icons/icon-192x192.png",
    },
}

export const viewport: Viewport = {
    themeColor: "#0ea5e9",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
          <body>
              <AuthProvider>
                <Header/>
                {children}
              </AuthProvider>
          </body>
        </html>
    )
}
