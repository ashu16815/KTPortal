'use client'

import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [session, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar session={session} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar session={session} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
