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
import type { MilestoneDTO, MilestoneStatus, TowerDTO } from '@/types'

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string; dot: string }> = {
  PENDING:     { label: 'Pending',     color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-300' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  COMPLETE:    { label: 'Complete',    color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  AT_RISK:     { label: 'At Risk',     color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  DELAYED:     { label: 'Delayed',     color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  BLOCKED:     { label: 'Blocked',     color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
}

const PHASE_COLOR: Record<string, string> = {
  PLAN: 'bg-gray-100 text-gray-600',
  KT: 'bg-blue-100 text-blue-700',
  SS: 'bg-amber-100 text-amber-700',
  PS: 'bg-orange-100 text-orange-700',
  OJT: 'bg-teal-100 text-teal-700',
  VRU: 'bg-indigo-100 text-indigo-700',
  TOLLGATE: 'bg-purple-100 text-purple-700',
  SIGN_OFF: 'bg-pink-100 text-pink-700',
  COMPLETE: 'bg-green-100 text-green-700',
}

const KT_PHASES = ['PLAN', 'KT', 'SS', 'PS', 'OJT', 'VRU', 'TOLLGATE', 'SIGN_OFF', 'COMPLETE']

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white'

// ─── Milestone Form Modal ─────────────────────────────────────────────────────

function MilestoneFormModal({
  milestone,
  towers,
  defaultTowerId,
  onClose,
  onSave,
  saving,
}: {
  milestone: MilestoneDTO | null
  towers: TowerDTO[]
  defaultTowerId: string | undefined
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    towerId: milestone?.towerId ?? defaultTowerId ?? '',
    name: milestone?.name ?? '',
    phase: milestone?.phase ?? 'KT',
    plannedDate: milestone?.plannedDate ? milestone.plannedDate.slice(0, 10) : '',
    status: milestone?.status ?? 'PENDING' as MilestoneStatus,
    notes: milestone?.notes ?? '',
    actualDate: milestone?.actualDate ? milestone.actualDate.slice(0, 10) : '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {milestone ? 'Edit Milestone' : 'Add Milestone'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tower *</label>
            <select className={inputCls} value={form.towerId} onChange={e => set('towerId', e.target.value)}>
              <option value="">Select tower...</option>
              {towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Milestone name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phase *</label>
              <select className={inputCls} value={form.phase} onChange={e => set('phase', e.target.value)}>
                {KT_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Planned Date *</label>
              <input className={inputCls} type="date" value={form.plannedDate} onChange={e => set('plannedDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Actual Date</label>
              <input className={inputCls} type="date" value={form.actualDate} onChange={e => set('actualDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={saving} onClick={() => onSave({
              ...form,
              actualDate: form.actualDate || undefined,
            })}>
              {milestone ? 'Save changes' : 'Add milestone'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Milestone Row ────────────────────────────────────────────────────────────

function MilestoneRow({
  m,
  onUpdate,
  canEdit,
  onEdit,
  onDelete,
}: {
  m: MilestoneDTO
  onUpdate: (id: string, status: MilestoneStatus) => void
  canEdit: boolean
  onEdit: (m: MilestoneDTO) => void
  onDelete: (m: MilestoneDTO) => void
}) {
  const cfg = STATUS_CONFIG[m.status as MilestoneStatus] ?? STATUS_CONFIG.PENDING
  const isOverdue = m.status !== 'COMPLETE' && new Date(m.plannedDate) < new Date()

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">{m.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PHASE_COLOR[m.phase] ?? 'bg-gray-100 text-gray-600'}`}>
            {m.phase}
          </span>
          {m.towerName && <span className="text-xs text-gray-400 truncate">{m.towerName}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs flex-wrap">
          <span className={isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}>
            {isOverdue ? '⚠ Overdue · ' : ''}Planned {formatDate(m.plannedDate)}
          </span>
          {m.actualDate && <span className="text-green-600">Completed {formatDate(m.actualDate)}</span>}
          {m.notes && <span className="text-gray-400 truncate max-w-xs">{m.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
        {canEdit && (
          <>
            <select
              value={m.status}
              onChange={e => onUpdate(m.id, e.target.value as MilestoneStatus)}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white"
              onClick={e => e.stopPropagation()}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button onClick={() => onEdit(m)} className="text-xs text-blue-600 hover:underline">Edit</button>
            <button onClick={() => onDelete(m)} className="text-xs text-red-500 hover:underline">Del</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MilestonesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [groupBy, setGroupBy] = useState<'tower' | 'phase'>('tower')
  const [formModal, setFormModal] = useState<{ open: boolean; milestone: MilestoneDTO | null }>({ open: false, milestone: null })
  const [deleteTarget, setDeleteTarget] = useState<MilestoneDTO | null>(null)
  const queryClient = useQueryClient()
  const { session } = useSession()
  const isReadOnly = session?.role === 'EXEC'
  const isAdmin = session?.role === 'ADMIN'

  const params: Record<string, string> = {}
  if (statusFilter === 'at_risk') params.status = 'AT_RISK'
  if (statusFilter === 'delayed') params.status = 'DELAYED'
  if (statusFilter === 'blocked') params.status = 'BLOCKED'

  const { data, isLoading, error } = useQuery<{ data: MilestoneDTO[] }>({
    queryKey: queryKeys.milestones(params),
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString()
      const res = await fetch(`/api/milestones${qs ? `?${qs}` : ''}`)
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
    mutationFn: async ({ id, status }: { id: string; status: MilestoneStatus }) => {
      const res = await fetch('/api/milestones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestones'] }),
  })

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const isEdit = !!formModal.milestone
      if (isEdit) {
        const res = await fetch('/api/milestones', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: formModal.milestone!.id, ...data }),
        })
        if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Failed')
        return res.json()
      } else {
        const res = await fetch('/api/milestones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Failed')
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
      setFormModal({ open: false, milestone: null })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
      setDeleteTarget(null)
    },
  })

  const canEditMilestone = (m: MilestoneDTO) =>
    !isReadOnly && (isAdmin || session?.towerId === m.towerId)

  const allMilestones = data?.data ?? []
  const towers = towersData?.data ?? []

  // Filter based on active view
  const milestones = statusFilter === 'active'
    ? allMilestones.filter(m => m.status !== 'COMPLETE')
    : statusFilter === 'complete'
    ? allMilestones.filter(m => m.status === 'COMPLETE')
    : allMilestones

  // Group milestones
  type MilestoneGroup = { key: string; items: MilestoneDTO[] }
  const grouped: MilestoneGroup[] = []
  if (groupBy === 'tower') {
    const towerNames = [...new Set(milestones.map(m => m.towerName ?? 'Unknown'))]
    towerNames.sort().forEach(tower => {
      const items = milestones.filter(m => (m.towerName ?? 'Unknown') === tower)
      if (items.length) grouped.push({ key: tower, items })
    })
  } else {
    KT_PHASES.forEach(phase => {
      const items = milestones.filter(m => m.phase === phase)
      if (items.length) grouped.push({ key: phase, items })
    })
  }

  // Summary counts
  const atRisk = allMilestones.filter(m => ['AT_RISK', 'DELAYED', 'BLOCKED'].includes(m.status)).length
  const completed = allMilestones.filter(m => m.status === 'COMPLETE').length
  const total = allMilestones.length

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>
  if (error) return <AppShell><div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Failed to load milestones.</div></AppShell>

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
              {isReadOnly && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Read Only</span>}
            </div>
            <p className="text-sm text-gray-500 mt-1">KT Phase gate tracking across all towers</p>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as 'tower' | 'phase')}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white"
            >
              <option value="tower">Group by Tower</option>
              <option value="phase">Group by Phase</option>
            </select>
            {!isReadOnly && (
              <Button onClick={() => setFormModal({ open: true, milestone: null })}>+ Add Milestone</Button>
            )}
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: total, color: 'text-gray-900' },
            { label: 'Complete', value: completed, color: 'text-green-600' },
            { label: 'At Risk / Delayed', value: atRisk, color: atRisk > 0 ? 'text-red-600' : 'text-green-600' },
            { label: 'Completion Rate', value: `${total > 0 ? Math.round((completed / total) * 100) : 0}%`, color: 'text-blue-600' },
          ].map(s => (
            <Card key={s.label} className="text-center py-3">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'active', label: 'Active' },
            { value: 'at_risk', label: 'At Risk / Delayed / Blocked' },
            { value: 'complete', label: 'Complete' },
            { value: 'all', label: 'All' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                statusFilter === f.value
                  ? 'bg-slate-800 text-white border-transparent'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grouped milestone list */}
        {grouped.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">✓</div>
              <div className="text-sm">No milestones in this view</div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(group => (
              <Card key={group.key} className="overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {groupBy === 'phase' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PHASE_COLOR[group.key] ?? 'bg-gray-100 text-gray-600'}`}>
                        {group.key}
                      </span>
                    )}
                    <span className="font-semibold text-sm text-gray-800">{groupBy === 'tower' ? group.key : `Phase: ${group.key}`}</span>
                  </div>
                  <span className="text-xs text-gray-400">{group.items.length} milestone{group.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div>
                  {group.items.map(m => (
                    <MilestoneRow
                      key={m.id}
                      m={m}
                      canEdit={canEditMilestone(m)}
                      onUpdate={(id, status) => statusMutation.mutate({ id, status })}
                      onEdit={m => setFormModal({ open: true, milestone: m })}
                      onDelete={m => setDeleteTarget(m)}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {formModal.open && (
        <MilestoneFormModal
          milestone={formModal.milestone}
          towers={towers}
          defaultTowerId={session?.towerId}
          onClose={() => setFormModal({ open: false, milestone: null })}
          onSave={data => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete milestone?</h3>
            <p className="text-sm text-gray-600 mb-4">&ldquo;{deleteTarget.name}&rdquo; will be permanently removed.</p>
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
