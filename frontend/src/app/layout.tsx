import { Toaster } from '@/components/ui/sonner'
import './globals.css'

import type { ReactNode } from 'react'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans`}>
        {children}
        <Toaster closeButton position="top-right" />
      </body>
    </html>
  )
}
