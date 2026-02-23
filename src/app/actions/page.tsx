'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { queryKeys } from '@/hooks/queryKeys'
import { formatDate, csvExport } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import type { ActionDTO, ActionStatus, TowerDTO } from '@/types'

const STATUS_OPTIONS: ActionStatus[] = ['OPEN', 'IN_PROGRESS', 'DONE', 'OVERDUE']
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white'

function statusClass(status: string) {
  switch (status) {
    case 'OVERDUE': return 'bg-red-100 text-red-700'
    case 'DONE': return 'bg-green-100 text-green-700'
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function priorityClass(priority: string) {
  switch (priority) {
    case 'CRITICAL': return 'bg-red-100 text-red-700'
    case 'HIGH': return 'bg-orange-100 text-orange-700'
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

// ─── Action Form Modal ────────────────────────────────────────────────────────

function ActionFormModal({
  item,
  towers,
  defaultTowerId,
  onClose,
  onSave,
  saving,
}: {
  item: ActionDTO | null
  towers: TowerDTO[]
  defaultTowerId: string | undefined
  onClose: () => void
  onSave: (data: Partial<ActionDTO>) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    towerId: item?.towerId ?? defaultTowerId ?? '',
    title: item?.title ?? '',
    description: item?.description ?? '',
    priority: item?.priority ?? 'MEDIUM',
    status: item?.status ?? 'OPEN',
    dueDate: item?.dueDate ? item.dueDate.slice(0, 10) : '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{item ? 'Edit Action' : 'Add Action'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tower *</label>
            <select className={inputCls} value={form.towerId} onChange={e => set('towerId', e.target.value)}>
              <option value="">Select tower...</option>
              {towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Action title..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input type="date" className={inputCls} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <Button
            onClick={() => onSave(form)}
            loading={saving}
            disabled={!form.towerId || !form.title.trim()}
          >
            {item ? 'Save changes' : 'Add action'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const queryClient = useQueryClient()
  const { session } = useSession()
  const isReadOnly = session?.role === 'EXEC'
  const isAdmin = session?.role === 'ADMIN'

  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterTower, setFilterTower] = useState('')
  const [modal, setModal] = useState<ActionDTO | null | 'new'>(null)
  const [deleteTarget, setDeleteTarget] = useState<ActionDTO | null>(null)

  const params = new URLSearchParams()
  if (filterStatus) params.set('status', filterStatus)
  if (filterPriority) params.set('priority', filterPriority)
  if (filterTower) params.set('towerId', filterTower)

  const { data, isLoading } = useQuery<{ data: ActionDTO[] }>({
    queryKey: queryKeys.actions({ status: filterStatus, priority: filterPriority }),
    queryFn: async () => {
      const res = await fetch(`/api/actions?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: towersData } = useQuery<{ data: TowerDTO[] }>({
    queryKey: ['towers'],
    queryFn: async () => {
      const res = await fetch('/api/towers')
      if (!res.ok) return { data: [] }
      return res.json()
    },
    enabled: !isReadOnly,
  })

  const towers = towersData?.data ?? []

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/actions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actions'] }),
  })

  const { mutate: saveAction, isPending: saving } = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<ActionDTO> }) => {
      const url = id ? `/api/actions/${id}` : '/api/actions'
      const res = await fetch(url, {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actions'] }); setModal(null) },
  })

  const { mutate: deleteAction, isPending: deleting } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/actions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['actions'] }); setDeleteTarget(null) },
  })

  const actions = data?.data ?? []

  const handleExport = () => {
    const csv = csvExport(
      ['Title', 'Tower', 'Status', 'Priority', 'Owner', 'Due Date'],
      actions.map(a => [
        a.title,
        a.towerName ?? '',
        a.status,
        a.priority,
        a.ownerName ?? '',
        a.dueDate ? formatDate(a.dueDate) : '',
      ])
    )
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `actions-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const overdueCount = actions.filter(a => a.status === 'OVERDUE').length
  const openCount = actions.filter(a => a.status === 'OPEN').length

  const canEditAction = (a: ActionDTO) => !isReadOnly && (isAdmin || session?.towerId === a.towerId)

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Actions Register</h1>
            <p className="text-sm text-gray-500 mt-1">
              {actions.length} actions
              {overdueCount > 0 && <span className="text-red-600 font-medium ml-2">· {overdueCount} overdue</span>}
              {openCount > 0 && <span className="text-amber-600 ml-2">· {openCount} open</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {!isReadOnly && (
              <Button size="sm" onClick={() => setModal('new')}>+ Add Action</Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={actions.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {towers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tower</label>
              <select
                value={filterTower}
                onChange={e => setFilterTower(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All towers</option>
                {towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {(filterStatus || filterPriority || filterTower) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterTower('') }}
              className="text-sm text-gray-400 hover:text-gray-600 pb-0.5"
            >
              Clear filters
            </button>
          )}
        </Card>

        {/* Table */}
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tower</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Owner</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Update Status</th>
                  {!isReadOnly && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actions.length === 0 ? (
                  <tr>
                    <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-12 text-center">
                      <div className="text-gray-300 text-3xl mb-2">✅</div>
                      <div className="text-gray-400">No actions found</div>
                    </td>
                  </tr>
                ) : (
                  actions.map(action => {
                    const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && action.status !== 'DONE'
                    const canEdit = canEditAction(action)
                    return (
                      <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 leading-tight">{action.title}</div>
                          {action.description && (
                            <div className="text-xs text-gray-400 mt-0.5 leading-snug max-w-xs">{action.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{action.towerName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusClass(action.status)}`}>
                            {action.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${priorityClass(action.priority)}`}>
                            {action.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{action.ownerName ?? '—'}</td>
                        <td className="px-4 py-3">
                          {action.dueDate ? (
                            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              {isOverdue && '⚠ '}{formatDate(action.dueDate)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {canEdit ? (
                            <select
                              value={action.status}
                              onChange={e => updateStatus({ id: action.id, status: e.target.value })}
                              className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-400">{action.status}</span>
                          )}
                        </td>
                        {!isReadOnly && (
                          <td className="px-4 py-3">
                            {canEdit && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setModal(action)}
                                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(action)}
                                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal !== null && (
        <ActionFormModal
          item={modal === 'new' ? null : modal}
          towers={towers}
          defaultTowerId={session?.towerId}
          onClose={() => setModal(null)}
          onSave={formData => saveAction({ id: modal === 'new' ? undefined : modal.id, data: formData })}
          saving={saving}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete action?</h3>
            <p className="text-sm text-gray-600 mb-5">
              &ldquo;{deleteTarget.title}&rdquo; will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <Button variant="danger" onClick={() => deleteAction(deleteTarget.id)} loading={deleting}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
