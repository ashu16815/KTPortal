'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { queryKeys } from '@/hooks/queryKeys'
import { formatDate } from '@/lib/utils'
import type { RaiddDTO, RaiddType, RaiddStatus } from '@/types'

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

function RaiddRow({ item, onStatusChange }: { item: RaiddDTO; onStatusChange: (id: string, status: RaiddStatus) => void }) {
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
          <div className="text-xs text-gray-400">
            Raised {formatDate(item.createdAt)} · Updated {formatDate(item.updatedAt)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RaiddPage() {
  const [activeTab, setActiveTab] = useState<RaiddType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const queryClient = useQueryClient()

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

  const mutation = useMutation({
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

  const items = data?.data ?? []
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
            <h1 className="text-2xl font-bold text-gray-900">RAIDD Log</h1>
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
                onStatusChange={(id, status) => mutation.mutate({ id, status })}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
