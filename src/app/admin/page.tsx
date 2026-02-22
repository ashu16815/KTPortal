'use client'

import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import Link from 'next/link'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  org: string
  towerId?: string
  towerName?: string
  createdAt: string
}

interface AdminTower {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  _count?: { users: number; submissions: number }
}

export default function AdminPage() {
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
    retry: false,
  })

  const { data: towersData, isLoading: towersLoading, error: towersError } = useQuery({
    queryKey: ['admin-towers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/towers', { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
    retry: false,
  })

  const users: AdminUser[] = usersData?.data ?? []
  const towers: AdminTower[] = towersData?.data ?? []
  const isLoading = usersLoading || towersLoading
  const dbUnavailable = !isLoading && (!!usersError || !!towersError)

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Manage users, towers, and system settings</p>
        </div>

        {dbUnavailable && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader><CardTitle className="text-amber-900">Database not connected</CardTitle></CardHeader>
            {(usersError || towersError) && (
              <p className="text-sm text-amber-900 font-medium mb-2">
                Error: {(usersError || towersError)?.message}
              </p>
            )}
            <p className="text-sm text-amber-800 mb-3">Azure SQL (or SQL Server) is required for admin data. In stub mode you can still use the app—login users come from the dropdown.</p>
            <p className="text-sm text-amber-800 mb-2 font-medium">If you just added DATABASE_URL: restart the dev server so it picks up the new env.</p>
            <ol className="text-sm text-amber-800 list-decimal list-inside space-y-1 font-mono">
              <li>Copy <code className="bg-amber-100 px-1 rounded">.env.example</code> to <code className="bg-amber-100 px-1 rounded">.env</code> and set <code className="bg-amber-100 px-1 rounded">DATABASE_URL</code> for Azure SQL</li>
              <li>Format: <code className="bg-amber-100 px-1 rounded">sqlserver://SERVER.database.windows.net:1433;database=DB;user=USER;password=PASS;encrypt=true</code></li>
              <li>Run <code className="bg-amber-100 px-1 rounded">npm run db:push</code> to create tables</li>
              <li>Run <code className="bg-amber-100 px-1 rounded">npm run db:seed</code> to seed data</li>
            </ol>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users</CardTitle>
              <span className="text-sm text-gray-500">{users.length} total</span>
            </CardHeader>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Org</th>
                    <th className="py-2">Tower</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="font-medium text-gray-900">{u.name}</span>
                        <div className="text-xs text-gray-400 truncate max-w-[180px]">{u.email}</div>
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{u.role}</td>
                      <td className="py-2 pr-3 text-gray-600">{u.org}</td>
                      <td className="py-2 text-gray-500">{u.towerName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No users in database. Use stub mode or seed the DB.</p>
            )}
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Towers</CardTitle>
              <span className="text-sm text-gray-500">{towers.length} total</span>
            </CardHeader>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {towers.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">{t.name}</div>
                    {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                    {(t._count?.users ?? 0) > 0 && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {t._count?.users} users · {t._count?.submissions ?? 0} submissions
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/tower/${t.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
            {towers.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No towers. Run <code className="bg-gray-100 px-1 rounded">npm run db:seed</code> to populate.</p>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/executive" className="text-blue-600 hover:underline text-sm">
              Executive Dashboard →
            </Link>
            <Link href="/submissions/compare" className="text-blue-600 hover:underline text-sm">
              Compare submissions →
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
