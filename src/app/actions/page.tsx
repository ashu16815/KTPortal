'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { queryKeys } from '@/hooks/queryKeys'
import { formatDate, csvExport } from '@/lib/utils'
import type { ActionDTO, ActionStatus } from '@/types'

const STATUS_OPTIONS: ActionStatus[] = ['OPEN', 'IN_PROGRESS', 'DONE', 'OVERDUE']
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

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

export default function ActionsPage() {
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const params = new URLSearchParams()
  if (filterStatus) params.set('status', filterStatus)
  if (filterPriority) params.set('priority', filterPriority)

  const { data, isLoading } = useQuery<{ data: ActionDTO[] }>({
    queryKey: queryKeys.actions({ status: filterStatus, priority: filterPriority }),
    queryFn: async () => {
      const res = await fetch(`/api/actions?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

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
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={actions.length === 0}>
            Export CSV
          </Button>
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
          {(filterStatus || filterPriority) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterPriority('') }}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="text-gray-300 text-3xl mb-2">✅</div>
                      <div className="text-gray-400">No actions found</div>
                    </td>
                  </tr>
                ) : (
                  actions.map(action => {
                    const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && action.status !== 'DONE'
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
                          <select
                            value={action.status}
                            onChange={e => updateStatus({ id: action.id, status: e.target.value })}
                            className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
