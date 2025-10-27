import type {Metadata} from 'next'

import '@/shared/styles/reset.css'
import '@/shared/styles/variables.css'
import '@/shared/styles/globals.css'
import { Header } from "@/widgets"

import { AuthProvider } from '@/shared/providers/AuthProvider'

export const metadata: Metadata = {
    title: "Kageo Wishlists",
    description: "Manage your wishlists with Kageo",
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
