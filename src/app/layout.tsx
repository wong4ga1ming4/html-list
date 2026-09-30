import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HTML List',
  description: '书签式 HTML 门户站',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  )
}
