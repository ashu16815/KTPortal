'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { RAGBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PulseTrend } from '@/components/charts/PulseTrend'
import { RAGDonut } from '@/components/charts/RAGDonut'
import { queryKeys } from '@/hooks/queryKeys'
import { formatDate } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import type { ExecDashboardPayload, RAGStatus, AiReportDTO } from '@/types'
import Link from 'next/link'

function AiReportSection({ report, onGenerate, generating }: {
  report: AiReportDTO | null
  onGenerate: () => void
  generating: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = report?.metadata ? (() => { try { return JSON.parse(report.metadata) } catch { return null } })() : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Intelligence Report</CardTitle>
            {report && (
              <p className="text-xs text-gray-400 mt-0.5">
                Generated {formatDate(report.createdAt)} by {report.generatedByName}
                {meta && ` · ${meta.totalTowers} towers · ${meta.ragCounts?.RED ?? 0} RED`}
              </p>
            )}
          </div>
          <Button size="sm" onClick={onGenerate} loading={generating}>
            {generating ? 'Analysing…' : report ? '↻ Regenerate' : '✦ Generate AI Report'}
          </Button>
        </div>
      </CardHeader>

      {!report && !generating && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">🤖</div>
          <p className="text-sm">No AI report generated yet.</p>
          <p className="text-xs mt-1">Click &ldquo;Generate AI Report&rdquo; to analyse live programme data.</p>
        </div>
      )}

      {generating && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-blue-600 text-sm">
            <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            Analysing programme data with Azure OpenAI…
          </div>
        </div>
      )}

      {report && !generating && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-900 leading-relaxed">{report.summary}</p>
          </div>

          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? '▲ Collapse details' : '▼ Show full analysis'}
          </button>

          {expanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: '✅ What\'s Working Well', content: report.workingWell, color: 'bg-green-50 border-green-100 text-green-900' },
                { label: '⚠️ What\'s Not Working', content: report.notWorking, color: 'bg-amber-50 border-amber-100 text-amber-900' },
                { label: '🔴 Common Risks & Issues', content: report.commonRisks, color: 'bg-red-50 border-red-100 text-red-900' },
                { label: '🎯 Priority Actions This Week', content: report.priorityActions, color: 'bg-purple-50 border-purple-100 text-purple-900' },
                { label: '📅 Forward Actions', content: report.forwardActions, color: 'bg-slate-50 border-slate-200 text-slate-800 md:col-span-2' },
              ].filter(s => s.content).map(section => (
                <div key={section.label} className={`border rounded-lg p-4 ${section.color}`}>
                  <div className="text-xs font-semibold mb-2">{section.label}</div>
                  <p className="text-xs leading-relaxed whitespace-pre-line">{section.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function ExecutiveDashboard() {
  const { session } = useSession()
  const queryClient = useQueryClient()
  const canGenerate = session?.role === 'ADMIN' || session?.role === 'EXEC'

  const { data: aiData } = useQuery<{ data: AiReportDTO | null }>({
    queryKey: ['ai-report'],
    queryFn: async () => {
      const res = await fetch('/api/ai/report')
      if (!res.ok) return { data: null }
      return res.json()
    },
  })

  const { mutate: generateReport, isPending: generating } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/report', { method: 'POST' })
      if (!res.ok) throw new Error('Generation failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-report'] }),
  })

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

        {/* AI Intelligence */}
        {canGenerate && (
          <AiReportSection
            report={aiData?.data ?? null}
            onGenerate={() => generateReport()}
            generating={generating}
          />
        )}

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
