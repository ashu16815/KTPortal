'use client'

import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { RAGBadge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PulseTrend } from '@/components/charts/PulseTrend'
import { RAGDonut } from '@/components/charts/RAGDonut'
import { queryKeys } from '@/hooks/queryKeys'
import { formatDate } from '@/lib/utils'
import type { ExecDashboardPayload, RAGStatus } from '@/types'
import Link from 'next/link'

export default function ExecutiveDashboard() {
  const { data, isLoading, error } = useQuery<{ data: ExecDashboardPayload }>({
    queryKey: queryKeys.execDashboard(),
    queryFn: async () => {
      const res = await fetch('/api/dashboard/executive')
      if (!res.ok) throw new Error('Failed to load')
      return res.json()
    },
  })

  const payload = data?.data

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>
  if (error || !payload) return (
    <AppShell>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load executive dashboard. Ensure the database is running and seeded.
      </div>
    </AppShell>
  )

  const ragCounts = payload.towers.reduce<Record<string, number>>((acc, t) => {
    const twgRag = t.twgScore?.ragStatus
    const tcsRag = t.tcsScore?.ragStatus
    // Use worst RAG
    const rag = twgRag === 'RED' || tcsRag === 'RED' ? 'RED' :
                twgRag === 'AMBER' || tcsRag === 'AMBER' ? 'AMBER' :
                (twgRag || tcsRag) ?? 'AMBER'
    acc[rag] = (acc[rag] ?? 0) + 1
    return acc
  }, {})

  const ragDonutData = (['GREEN', 'AMBER', 'RED'] as RAGStatus[]).map(r => ({
    rag: r,
    count: ragCounts[r] ?? 0,
    label: r,
  }))

  const allTrend = payload.towers.flatMap(t => t.trend)
  const totalOverdue = payload.towers.reduce((sum, t) => sum + t.overdueActions, 0)
  const totalPending = payload.towers.reduce((sum, t) => sum + t.pendingDecisions, 0)

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Week ending {formatDate(payload.weekEnding)}</p>
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>{payload.towers.length} towers</span>
            <span>{payload.totalSubmissions} submissions</span>
            {totalOverdue > 0 && <span className="text-red-600 font-medium">{totalOverdue} overdue</span>}
            {totalPending > 0 && <span className="text-amber-600 font-medium">{totalPending} decisions needed</span>}
          </div>
        </div>

        {/* Summary charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle>Tower RAG Overview</CardTitle></CardHeader>
            <RAGDonut data={ragDonutData} />
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Health Score Trend — All Towers</CardTitle></CardHeader>
            {allTrend.length > 0 ? (
              <PulseTrend trend={allTrend} />
            ) : (
              <div className="text-gray-400 text-sm py-8 text-center">
                No trend data. Submit weekly updates to see trends.
              </div>
            )}
          </Card>
        </div>

        {/* Tower tiles */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Tower Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {payload.towers.map(t => {
              const twgRag = t.twgScore?.ragStatus as RAGStatus | undefined
              const tcsRag = t.tcsScore?.ragStatus as RAGStatus | undefined
              return (
                <Link key={t.tower.id} href={`/dashboard/tower/${t.tower.id}`}>
                  <Card className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{t.tower.name}</h3>
                        {t.tower.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{t.tower.description}</p>
                        )}
                      </div>
                      {t.varianceFlagged && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium whitespace-nowrap">⚠ High Δ</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <div className="text-xs text-gray-400 mb-1">TWG</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {t.twgScore ? t.twgScore.totalScore : <span className="text-gray-300">—</span>}
                        </div>
                        {twgRag && <div className="mt-1"><RAGBadge rag={twgRag} /></div>}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <div className="text-xs text-gray-400 mb-1">TCS</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {t.tcsScore ? t.tcsScore.totalScore : <span className="text-gray-300">—</span>}
                        </div>
                        {tcsRag && <div className="mt-1"><RAGBadge rag={tcsRag} /></div>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <span>{t.overdueActions > 0
                        ? <span className="text-red-500">⚠ {t.overdueActions} overdue</span>
                        : '✓ Actions clear'
                      }</span>
                      {t.variance !== undefined && (
                        <span className={t.varianceFlagged ? 'text-orange-500 font-medium' : ''}>
                          Δ {t.variance}pts
                        </span>
                      )}
                      <span>{Math.round(t.artefactCoverage * 100)}% artefacts</span>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Overdue Actions</CardTitle></CardHeader>
            {payload.towers.some(t => t.overdueActions > 0) ? (
              <ul className="space-y-2">
                {payload.towers.filter(t => t.overdueActions > 0).map(t => (
                  <li key={t.tower.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                    <Link href={`/dashboard/tower/${t.tower.id}`} className="text-blue-600 hover:underline">{t.tower.name}</Link>
                    <span className="text-red-600 font-medium">{t.overdueActions} overdue</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">✓ No overdue actions</p>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>Decisions Needed</CardTitle></CardHeader>
            {payload.towers.some(t => t.pendingDecisions > 0) ? (
              <ul className="space-y-2">
                {payload.towers.filter(t => t.pendingDecisions > 0).map(t => (
                  <li key={t.tower.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                    <Link href={`/dashboard/tower/${t.tower.id}`} className="text-blue-600 hover:underline">{t.tower.name}</Link>
                    <span className="text-amber-600 font-medium">{t.pendingDecisions} pending</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">✓ No pending decisions</p>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
