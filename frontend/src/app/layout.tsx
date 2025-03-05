import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Copy Bot',
  description: 'GitHub 리포지토리 및 폴더 복사 도구',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 min-h-screen flex items-center justify-center`}>
        {children}
      </body>
    </html>
  )
}