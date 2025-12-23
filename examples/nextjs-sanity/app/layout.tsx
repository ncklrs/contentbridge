import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContentBridge + Sanity Example',
  description: 'Next.js 14 App Router with ContentBridge and Sanity CMS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-6">
              <h1 className="text-2xl font-bold text-gray-900">
                ContentBridge + Sanity
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Next.js 14 App Router Example
              </p>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
