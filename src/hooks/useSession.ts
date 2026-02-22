'use client'

import { useState, useEffect } from 'react'
import type { SessionUser } from '@/types'

const COOKIE_NAME = 'kt_stub_session'

export function useSession() {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const read = () => {
      try {
        const match = document.cookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))
        if (!match) { setSession(null); return }
        const value = match.split('=').slice(1).join('=') // preserve = in base64 padding
        const decoded = atob(value)
        setSession(JSON.parse(decoded) as SessionUser)
      } catch {
        setSession(null)
      }
    }
    read()
    setLoading(false)
  }, [])

  const logout = () => {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
    setSession(null)
    window.location.href = '/login'
  }

  return { session, loading, logout }
}
