import type {Metadata} from 'next'
import './globals.css'
import Header from "@/components/header"
import SessionProvider from '@/components/SessionProvider'

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
              <SessionProvider>
                <Header/>
                {children}
              </SessionProvider>
          </body>
        </html>
    )
}
