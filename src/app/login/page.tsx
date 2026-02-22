'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface User {
  id: string
  name: string
  role: string
  org: string
  towerId?: string
}

const STUB_USERS: User[] = [
  { id: 'stub-admin', name: 'Portal Admin', role: 'ADMIN', org: 'ADMIN' },
  { id: 'stub-exec', name: 'Exec Viewer', role: 'EXEC', org: 'TWG' },
  { id: 'stub-twg-lead', name: 'TWG Lead (Finance)', role: 'TWG_LEAD', org: 'TWG' },
  { id: 'stub-tcs-lead', name: 'TCS Lead (Finance)', role: 'TCS_LEAD', org: 'TCS' },
]

export default function LoginPage() {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const match = document.cookie.split('; ').find(c => c.startsWith('kt_stub_session='))
    if (!match) return
    try {
      const value = match.split('=').slice(1).join('=') // preserve = in base64 padding
      const session = JSON.parse(atob(value)) as User
      if (session.role === 'ADMIN') router.push('/admin')
      else if (session.role === 'EXEC') router.push('/dashboard/executive')
      else if (session.towerId) router.push(`/dashboard/tower/${session.towerId}`)
      else router.push('/dashboard/executive')
    } catch {
      router.push('/dashboard/executive')
    }
  }, [router])

  // Try to load real users from DB (public endpoint, no auth required)
  const { data: usersData } = useQuery<{ data: (User & { towerName?: string })[] }>({
    queryKey: ['users-login'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) return { data: [] }
      return res.json()
    },
    retry: false,
  })

  const dbUsers = usersData?.data ?? []
  const users = dbUsers.length > 0 ? dbUsers : STUB_USERS

  const groupedUsers = users.reduce<Record<string, User[]>>((acc, u) => {
    const key = u.org
    if (!acc[key]) acc[key] = []
    acc[key].push(u)
    return acc
  }, {})

  const handleLogin = async () => {
    if (!selectedUserId) { setError('Please select a user'); return }
    setLoading(true)
    setError('')

    try {
      const selectedUser = users.find(u => u.id === selectedUserId)
      if (!selectedUser) { setError('User not found'); setLoading(false); return }

      if (selectedUserId.startsWith('stub-')) {
        // Direct stub session
        const session = {
          id: selectedUserId,
          email: `${selectedUserId}@kt-portal.local`,
          name: selectedUser.name,
          role: selectedUser.role,
          org: selectedUser.org,
          towerId: selectedUser.towerId,
        }
        const cookie = btoa(JSON.stringify(session))
        document.cookie = `kt_stub_session=${cookie}; path=/; max-age=28800; samesite=lax`
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUserId }),
          credentials: 'include',
        })
        if (!res.ok) { setError('Login failed'); setLoading(false); return }
      }

      const role = selectedUser.role
      if (role === 'ADMIN') router.push('/admin')
      else if (role === 'EXEC') router.push('/dashboard/executive')
      else if (selectedUser.towerId) router.push(`/dashboard/tower/${selectedUser.towerId}`)
      else router.push('/dashboard/executive')

    } catch {
      setError('Login error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏛️</div>
          <h1 className="text-3xl font-bold text-white">KT Portal</h1>
          <p className="text-slate-400 mt-2">Project Ora — Knowledge Transfer</p>
        </div>

        <Card className="shadow-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign In</h2>
          <p className="text-sm text-gray-500 mb-5">
            {dbUsers.length > 0 ? 'Select your account:' : 'Stub mode — select a role:'}
          </p>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {Object.entries(groupedUsers).map(([org, orgUsers]) => (
              <div key={org}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{org}</div>
                <div className="space-y-1">
                  {orgUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        selectedUserId === user.id
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{user.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <Button className="w-full mt-5" onClick={handleLogin} loading={loading} disabled={!selectedUserId}>
            Sign In
          </Button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Stub authentication — drop-in MSAL interface ready
          </p>
        </Card>
      </div>
    </div>
  )
}
