import type { Metadata, Viewport } from 'next'

import '@/shared/styles/reset.css'
import '@/shared/styles/variables.css'
import '@/shared/styles/globals.css'
import { Header } from "@/widgets"

import { AuthProvider } from '@/shared/providers/AuthProvider'

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
        <html lang="en">
          <body>
              <AuthProvider>
                <Header/>
                {children}
              </AuthProvider>
          </body>
        </html>
    )
}
