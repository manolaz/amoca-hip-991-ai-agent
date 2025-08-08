import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMOCA',
  description: 'Healthcare data contribution on Hedera',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
