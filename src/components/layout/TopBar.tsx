'use client'

import type { SessionUser } from '@/types'
import { useRouter } from 'next/navigation'

interface Props { session: SessionUser }

export function TopBar({ session }: Props) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    document.cookie = 'kt_stub_session=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="text-sm text-gray-500">
        Logged in as <span className="font-medium text-gray-900">{session.name}</span>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        Sign out
      </button>
    </header>
  )
}
