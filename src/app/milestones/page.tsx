'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { queryKeys } from '@/hooks/queryKeys'
import { formatDate } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import type { MilestoneDTO, MilestoneStatus } from '@/types'

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

function MilestoneRow({
  m,
  onUpdate,
  canEdit,
}: {
  m: MilestoneDTO
  onUpdate: (id: string, status: MilestoneStatus) => void
  canEdit: boolean
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
        )}
      </div>
    </div>
  )
}

export default function MilestonesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [groupBy, setGroupBy] = useState<'tower' | 'phase'>('tower')
  const queryClient = useQueryClient()
  const { session } = useSession()
  const isReadOnly = session?.role === 'EXEC'

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

  const mutation = useMutation({
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

  const allMilestones = data?.data ?? []

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
    const towers = [...new Set(milestones.map(m => m.towerName ?? 'Unknown'))]
    towers.sort().forEach(tower => {
      const items = milestones.filter(m => (m.towerName ?? 'Unknown') === tower)
      if (items.length) grouped.push({ key: tower, items })
    })
  } else {
    const phases = ['PLAN', 'KT', 'SS', 'PS', 'OJT', 'VRU', 'TOLLGATE', 'SIGN_OFF', 'COMPLETE']
    phases.forEach(phase => {
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
                      canEdit={!isReadOnly && (session?.role === 'ADMIN' || session?.towerId === m.towerId)}
                      onUpdate={(id, status) => mutation.mutate({ id, status })}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
