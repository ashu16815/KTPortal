'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { queryKeys } from '@/hooks/queryKeys'
import { formatDate } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import type { RaiddDTO, RaiddType, RaiddStatus, TowerDTO } from '@/types'

const TABS: { type: RaiddType | 'ALL'; label: string; color: string }[] = [
  { type: 'ALL', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { type: 'RISK', label: 'Risks', color: 'bg-red-100 text-red-700' },
  { type: 'ASSUMPTION', label: 'Assumptions', color: 'bg-purple-100 text-purple-700' },
  { type: 'ISSUE', label: 'Issues', color: 'bg-orange-100 text-orange-700' },
  { type: 'DEPENDENCY', label: 'Dependencies', color: 'bg-blue-100 text-blue-700' },
  { type: 'DECISION', label: 'Decisions', color: 'bg-teal-100 text-teal-700' },
]

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  ESCALATED: 'bg-orange-100 text-orange-700',
  ACCEPTED: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-green-100 text-green-700',
}

const IMPACT_COLOR: Record<string, string> = {
  HIGH: 'text-red-600 font-semibold',
  MEDIUM: 'text-amber-600 font-medium',
  LOW: 'text-green-600',
}

const TYPE_ICON: Record<string, string> = {
  RISK: '⚠️', ASSUMPTION: '💡', ISSUE: '🔴', DEPENDENCY: '🔗', DECISION: '🔷',
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white'

// ─── RAIDD Form Modal ─────────────────────────────────────────────────────────

function RaiddFormModal({
  item,
  towers,
  defaultTowerId,
  onClose,
  onSave,
  saving,
}: {
  item: RaiddDTO | null
  towers: TowerDTO[]
  defaultTowerId: string | undefined
  onClose: () => void
  onSave: (data: Partial<RaiddDTO>) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    type: item?.type ?? 'RISK' as RaiddType,
    title: item?.title ?? '',
    description: item?.description ?? '',
    impact: item?.impact ?? 'MEDIUM',
    owner: item?.owner ?? '',
    dueDate: item?.dueDate ? item.dueDate.slice(0, 10) : '',
    mitigation: item?.mitigation ?? '',
    notes: item?.notes ?? '',
    towerId: item?.towerId ?? defaultTowerId ?? '',
    status: item?.status ?? 'OPEN' as RaiddStatus,
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{item ? 'Edit RAIDD Item' : 'Add RAIDD Item'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>
                {(['RISK', 'ASSUMPTION', 'ISSUE', 'DEPENDENCY', 'DECISION'] as RaiddType[]).map(t => (
                  <option key={t} value={t}>{TYPE_ICON[t]} {t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Impact</label>
              <select className={inputCls} value={form.impact} onChange={e => set('impact', e.target.value)}>
                {['HIGH', 'MEDIUM', 'LOW'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tower</label>
            <select className={inputCls} value={form.towerId} onChange={e => set('towerId', e.target.value)}>
              <option value="">— Programme-wide —</option>
              {towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Brief title" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detailed description" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Owner</label>
              <input className={inputCls} value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Owner name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input className={inputCls} type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
          </div>

          {(form.type === 'RISK' || form.type === 'ISSUE') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mitigation / Response</label>
              <textarea className={inputCls} rows={2} value={form.mitigation} onChange={e => set('mitigation', e.target.value)} placeholder="Planned response or mitigation actions" />
            </div>
          )}

          {item && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {(['OPEN', 'IN_PROGRESS', 'ESCALATED', 'ACCEPTED', 'CLOSED'] as RaiddStatus[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={saving} onClick={() => onSave({
              ...form,
              towerId: form.towerId || null,
              dueDate: form.dueDate || undefined,
            } as Partial<RaiddDTO>)}>
              {item ? 'Save changes' : 'Add item'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── RAIDD Row ────────────────────────────────────────────────────────────────

function RaiddRow({
  item,
  onStatusChange,
  canEdit,
  onEdit,
  onDelete,
}: {
  item: RaiddDTO
  onStatusChange: (id: string, status: RaiddStatus) => void
  canEdit: boolean
  onEdit: (item: RaiddDTO) => void
  onDelete: (item: RaiddDTO) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-base mt-0.5 flex-shrink-0">{TYPE_ICON[item.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{item.title}</span>
            {item.towerName && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.towerName}</span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {item.status}
            </span>
            {item.impact && (
              <span className={`text-xs ${IMPACT_COLOR[item.impact] ?? 'text-gray-500'}`}>
                Impact: {item.impact}
              </span>
            )}
            {item.owner && <span className="text-xs text-gray-400">Owner: {item.owner}</span>}
            {item.dueDate && (
              <span className={`text-xs ${new Date(item.dueDate) < new Date() && item.status !== 'CLOSED' ? 'text-red-500' : 'text-gray-400'}`}>
                Due {formatDate(item.dueDate)}
              </span>
            )}
          </div>
        </div>
        <span className="text-gray-300 text-xs mt-1 flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 bg-gray-50 border-t border-gray-100 space-y-3">
          {item.description && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
              <p className="text-sm text-gray-700">{item.description}</p>
            </div>
          )}
          {item.mitigation && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Mitigation / Response</div>
              <p className="text-sm text-gray-700">{item.mitigation}</p>
            </div>
          )}
          {item.notes && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Notes</div>
              <p className="text-sm text-gray-700">{item.notes}</p>
            </div>
          )}
          {canEdit && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5">Update Status</div>
              <div className="flex gap-2 flex-wrap">
                {(['OPEN', 'IN_PROGRESS', 'ESCALATED', 'ACCEPTED', 'CLOSED'] as RaiddStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(item.id, s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      item.status === s
                        ? `${STATUS_COLOR[s]} border-transparent`
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {canEdit && (
            <div className="flex gap-3 pt-1">
              <button onClick={() => onEdit(item)} className="text-xs text-blue-600 hover:underline">Edit item</button>
              <button onClick={() => onDelete(item)} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>
          )}
          <div className="text-xs text-gray-400">
            Raised {formatDate(item.createdAt)} · Updated {formatDate(item.updatedAt)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RaiddPage() {
  const [activeTab, setActiveTab] = useState<RaiddType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [formModal, setFormModal] = useState<{ open: boolean; item: RaiddDTO | null }>({ open: false, item: null })
  const [deleteTarget, setDeleteTarget] = useState<RaiddDTO | null>(null)
  const queryClient = useQueryClient()
  const { session } = useSession()
  const isReadOnly = session?.role === 'EXEC'
  const isAdmin = session?.role === 'ADMIN'

  const params: Record<string, string> = {}
  if (activeTab !== 'ALL') params.type = activeTab
  if (statusFilter === 'open') params.status = 'OPEN,IN_PROGRESS,ESCALATED'

  const { data, isLoading, error } = useQuery<{ data: RaiddDTO[] }>({
    queryKey: queryKeys.raidd(params),
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString()
      const res = await fetch(`/api/raidd${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: towersData } = useQuery<{ data: TowerDTO[] }>({
    queryKey: queryKeys.towers(),
    queryFn: async () => { const r = await fetch('/api/towers'); return r.json() },
    enabled: !isReadOnly,
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RaiddStatus }) => {
      const res = await fetch(`/api/raidd/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(status === 'CLOSED' ? { closedAt: new Date().toISOString() } : {}) }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['raidd'] }),
  })

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<RaiddDTO>) => {
      const isEdit = !!formModal.item
      const url = isEdit ? `/api/raidd/${formModal.item!.id}` : '/api/raidd'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidd'] })
      setFormModal({ open: false, item: null })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/raidd/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raidd'] })
      setDeleteTarget(null)
    },
  })

  const canEditItem = (item: RaiddDTO) =>
    !isReadOnly && (isAdmin || session?.towerId === item.towerId || (!item.towerId && isAdmin))

  const items = data?.data ?? []
  const towers = towersData?.data ?? []
  const counts = TABS.slice(1).reduce((acc, t) => {
    acc[t.type] = items.filter(i => i.type === t.type).length
    return acc
  }, {} as Record<string, number>)

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>
  if (error) return <AppShell><div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Failed to load RAIDD log.</div></AppShell>

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">RAIDD Log</h1>
              {isReadOnly && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Read Only</span>}
            </div>
            <p className="text-sm text-gray-500 mt-1">Risks · Assumptions · Issues · Dependencies · Decisions</p>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white"
            >
              <option value="open">Open / Active</option>
              <option value="all">All statuses</option>
            </select>
            {!isReadOnly && (
              <Button onClick={() => setFormModal({ open: true, item: null })}>+ Add Item</Button>
            )}
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeTab === tab.type
                  ? `${tab.color} border-transparent`
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {tab.label}
              {tab.type !== 'ALL' && counts[tab.type] > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({counts[tab.type]})</span>
              )}
              {tab.type === 'ALL' && (
                <span className="ml-1.5 text-xs opacity-70">({items.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">✓</div>
              <div className="text-sm">No {activeTab !== 'ALL' ? activeTab.toLowerCase() + 's' : 'items'} in this view</div>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <RaiddRow
                key={item.id}
                item={item}
                canEdit={canEditItem(item)}
                onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                onEdit={i => setFormModal({ open: true, item: i })}
                onDelete={i => setDeleteTarget(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {formModal.open && (
        <RaiddFormModal
          item={formModal.item}
          towers={towers}
          defaultTowerId={session?.towerId}
          onClose={() => setFormModal({ open: false, item: null })}
          onSave={data => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete RAIDD item?</h3>
            <p className="text-sm text-gray-600 mb-4">&ldquo;{deleteTarget.title}&rdquo; will be permanently removed.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >Delete</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
