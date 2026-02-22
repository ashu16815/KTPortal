'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  org: string
  towerId?: string | null
  towerName?: string
  createdAt: string
}

interface AdminTower {
  id: string
  name: string
  description?: string | null
  groupId?: string | null
  ktPhase?: string
  twgLeadName?: string | null
  tcsLeadName?: string | null
  createdAt: string
  updatedAt: string
  _count?: { users: number; submissions: number }
}

const ROLES = ['ADMIN', 'EXEC', 'TWG_LEAD', 'TCS_LEAD', 'TWG_OWNER', 'TCS_OWNER']
const ORGS = ['TWG', 'TCS', 'ADMIN']
const KT_PHASES = ['PLAN', 'KT', 'SS', 'PS', 'OJT', 'VRU', 'COMPLETE']

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 items-start">
      <label className="text-sm font-medium text-gray-700 pt-2">{label}</label>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white'

// ─── User Modal ───────────────────────────────────────────────────────────────

function UserModal({
  user,
  towers,
  onClose,
  onSave,
  saving,
}: {
  user: AdminUser | null
  towers: AdminTower[]
  onClose: () => void
  onSave: (data: Partial<AdminUser>) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'TWG_LEAD',
    org: user?.org ?? 'TWG',
    towerId: user?.towerId ?? '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title={user ? 'Edit User' : 'Add User'} onClose={onClose}>
      <div className="space-y-4">
        <FieldRow label="Name">
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
        </FieldRow>
        <FieldRow label="Email">
          <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@example.com" />
        </FieldRow>
        <FieldRow label="Role">
          <select className={inputCls} value={form.role} onChange={e => set('role', e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Org">
          <select className={inputCls} value={form.org} onChange={e => set('org', e.target.value)}>
            {ORGS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Tower">
          <select className={inputCls} value={form.towerId ?? ''} onChange={e => set('towerId', e.target.value)}>
            <option value="">— No tower —</option>
            {towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </FieldRow>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={() => onSave(form)}>
            {user ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Tower Modal ──────────────────────────────────────────────────────────────

function TowerModal({
  tower,
  onClose,
  onSave,
  saving,
}: {
  tower: AdminTower | null
  onClose: () => void
  onSave: (data: Partial<AdminTower>) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    name: tower?.name ?? '',
    description: tower?.description ?? '',
    ktPhase: tower?.ktPhase ?? 'KT',
    twgLeadName: tower?.twgLeadName ?? '',
    tcsLeadName: tower?.tcsLeadName ?? '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title={tower ? 'Edit Tower' : 'Add Tower'} onClose={onClose}>
      <div className="space-y-4">
        <FieldRow label="Name">
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tower name" />
        </FieldRow>
        <FieldRow label="Description">
          <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description" />
        </FieldRow>
        <FieldRow label="KT Phase">
          <select className={inputCls} value={form.ktPhase} onChange={e => set('ktPhase', e.target.value)}>
            {KT_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="TWG Lead">
          <input className={inputCls} value={form.twgLeadName} onChange={e => set('twgLeadName', e.target.value)} placeholder="TWG lead name" />
        </FieldRow>
        <FieldRow label="TCS Lead">
          <input className={inputCls} value={form.tcsLeadName} onChange={e => set('tcsLeadName', e.target.value)} placeholder="TCS lead name" />
        </FieldRow>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={() => onSave(form)}>
            {tower ? 'Save changes' : 'Create tower'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────

function DeleteConfirm({ label, onConfirm, onCancel, deleting }: { label: string; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <Modal title="Confirm delete" onClose={onCancel}>
      <p className="text-sm text-gray-700 mb-4">Delete <strong>{label}</strong>? This cannot be undone.</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button loading={deleting} onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
      </div>
    </Modal>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  EXEC: 'bg-blue-100 text-blue-700',
  TWG_LEAD: 'bg-green-100 text-green-700',
  TCS_LEAD: 'bg-teal-100 text-teal-700',
  TWG_OWNER: 'bg-lime-100 text-lime-700',
  TCS_OWNER: 'bg-cyan-100 text-cyan-700',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { session, loading: sessionLoading } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'users' | 'towers'>('users')
  const [userModal, setUserModal] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null })
  const [towerModal, setTowerModal] = useState<{ open: boolean; tower: AdminTower | null }>({ open: false, tower: null })
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'tower'; id: string; label: string } | null>(null)

  const queryClient = useQueryClient()

  // ── Queries — only fire once session is confirmed ──
  const queryEnabled = !sessionLoading && !!session && session.role === 'ADMIN'

  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message ?? `HTTP ${res.status}`) }
      return res.json()
    },
    enabled: queryEnabled,
    retry: false,
  })

  const { data: towersData, isLoading: towersLoading, error: towersError } = useQuery({
    queryKey: ['admin-towers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/towers', { credentials: 'include' })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message ?? `HTTP ${res.status}`) }
      return res.json()
    },
    enabled: queryEnabled,
    retry: false,
  })

  // ── User mutations ──
  const createUser = useMutation({
    mutationFn: async (data: Partial<AdminUser>) => {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Failed')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setUserModal({ open: false, user: null }) },
  })

  const updateUser = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AdminUser> & { id: string }) => {
      const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...data }) })
      if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Failed')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setUserModal({ open: false, user: null }) },
  })

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Failed')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setDeleteTarget(null) },
  })

  // ── Tower mutations ──
  const createTower = useMutation({
    mutationFn: async (data: Partial<AdminTower>) => {
      const res = await fetch('/api/admin/towers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Failed')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-towers'] }); setTowerModal({ open: false, tower: null }) },
  })

  const updateTower = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AdminTower> & { id: string }) => {
      const res = await fetch(`/api/admin/towers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Failed')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-towers'] }); setTowerModal({ open: false, tower: null }) },
  })

  const deleteTower = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/towers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Failed')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-towers'] }); setDeleteTarget(null) },
  })

  const users: AdminUser[] = usersData?.data ?? []
  const towers: AdminTower[] = towersData?.data ?? []
  const isLoading = (usersLoading || towersLoading) && queryEnabled
  const apiError = usersError || towersError

  // Wait for session to load
  if (sessionLoading) return <AppShell><LoadingSpinner /></AppShell>

  // Not logged in → redirect to login
  if (!session) {
    router.replace('/login')
    return <AppShell><LoadingSpinner /></AppShell>
  }

  // Not admin → redirect to dashboard
  if (session.role !== 'ADMIN') {
    return <AppShell><div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Admin access required. You are logged in as {session.role}.</div></AppShell>
  }

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>

  const handleUserSave = (data: Partial<AdminUser>) => {
    if (userModal.user) updateUser.mutate({ ...data, id: userModal.user.id })
    else createUser.mutate(data)
  }

  const handleTowerSave = (data: Partial<AdminTower>) => {
    if (towerModal.tower) updateTower.mutate({ ...data, id: towerModal.tower.id })
    else createTower.mutate(data)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'user') deleteUser.mutate(deleteTarget.id)
    else deleteTower.mutate(deleteTarget.id)
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
            <p className="text-sm text-gray-500 mt-1">Manage users, towers, and system settings</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/executive" className="text-sm text-blue-600 hover:underline">Executive Dashboard →</Link>
          </div>
        </div>

        {/* Error banner */}
        {apiError && (
          <Card className={apiError.message.toLowerCase().includes('auth') || apiError.message.includes('401') || apiError.message.includes('Login') ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}>
            <p className="text-sm font-medium mb-1" style={{ color: apiError.message.toLowerCase().includes('auth') || apiError.message.includes('401') || apiError.message.includes('Login') ? '#7f1d1d' : '#78350f' }}>
              {apiError.message.toLowerCase().includes('auth') || apiError.message.includes('401') || apiError.message.includes('Login')
                ? 'Session expired — please sign in again'
                : 'Database not connected'}
            </p>
            <p className="text-sm" style={{ color: '#92400e' }}>{apiError.message}</p>
            {(apiError.message.toLowerCase().includes('auth') || apiError.message.includes('401') || apiError.message.includes('Login')) && (
              <button onClick={() => router.push('/login')} className="mt-2 text-sm text-red-700 underline font-medium">Go to login →</button>
            )}
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {(['users', 'towers'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                tab === t ? 'bg-slate-800 text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {t === 'users' ? `Users (${users.length})` : `Towers (${towers.length})`}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {tab === 'users' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Users</h2>
              <Button onClick={() => setUserModal({ open: true, user: null })}>+ Add User</Button>
            </div>
            {users.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No users. Run <code className="bg-gray-100 px-1 rounded">npm run db:seed</code>.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="pb-2 pr-4">Name / Email</th>
                      <th className="pb-2 pr-4">Role</th>
                      <th className="pb-2 pr-4">Org</th>
                      <th className="pb-2 pr-4">Tower</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="py-2.5 pr-4">
                          <div className="font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[u.role] ?? 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600">{u.org}</td>
                        <td className="py-2.5 pr-4 text-gray-500">{u.towerName ?? '—'}</td>
                        <td className="py-2.5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setUserModal({ open: true, user: u })}
                              className="text-xs text-blue-600 hover:underline"
                            >Edit</button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'user', id: u.id, label: u.name })}
                              className="text-xs text-red-500 hover:underline"
                            >Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Towers tab */}
        {tab === 'towers' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Towers</h2>
              <Button onClick={() => setTowerModal({ open: true, tower: null })}>+ Add Tower</Button>
            </div>
            {towers.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No towers. Run <code className="bg-gray-100 px-1 rounded">npm run db:seed</code>.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Phase</th>
                      <th className="pb-2 pr-4">TWG Lead</th>
                      <th className="pb-2 pr-4">TCS Lead</th>
                      <th className="pb-2 pr-4">Users</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {towers.map(t => (
                      <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="py-2.5 pr-4">
                          <div className="font-medium text-gray-900">{t.name}</div>
                          {t.description && <div className="text-xs text-gray-400">{t.description}</div>}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{t.ktPhase ?? 'KT'}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600">{t.twgLeadName ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-gray-600">{t.tcsLeadName ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-gray-500">{t._count?.users ?? 0}</td>
                        <td className="py-2.5">
                          <div className="flex gap-2">
                            <Link href={`/dashboard/tower/${t.id}`} className="text-xs text-gray-500 hover:underline">View</Link>
                            <button
                              onClick={() => setTowerModal({ open: true, tower: t })}
                              className="text-xs text-blue-600 hover:underline"
                            >Edit</button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'tower', id: t.id, label: t.name })}
                              className="text-xs text-red-500 hover:underline"
                            >Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Modals */}
      {userModal.open && (
        <UserModal
          user={userModal.user}
          towers={towers}
          onClose={() => setUserModal({ open: false, user: null })}
          onSave={handleUserSave}
          saving={createUser.isPending || updateUser.isPending}
        />
      )}
      {towerModal.open && (
        <TowerModal
          tower={towerModal.tower}
          onClose={() => setTowerModal({ open: false, tower: null })}
          onSave={handleTowerSave}
          saving={createTower.isPending || updateTower.isPending}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.label}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleteUser.isPending || deleteTower.isPending}
        />
      )}
    </AppShell>
  )
}
