import { Toaster } from '@/components/ui/sonner'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
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