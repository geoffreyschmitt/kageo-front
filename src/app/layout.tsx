import type {Metadata} from 'next'
import '@/shared/styles/reset.css'
import '@/shared/styles/variables.css'
import '@/shared/styles/globals.css'
import { Header } from "@/widgets"
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
