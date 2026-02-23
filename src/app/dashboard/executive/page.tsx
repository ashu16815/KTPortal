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

// ─── AI Executive Summary Banner ─────────────────────────────────────────────

function AiExecutiveSummary({ report, canRefresh, onRefresh, refreshing }: {
  report: AiReportDTO | null
  canRefresh: boolean
  onRefresh: () => void
  refreshing: boolean
}) {
  const [showDetails, setShowDetails] = useState(true)
  const meta = report?.metadata ? (() => { try { return JSON.parse(report.metadata) } catch { return null } })() : null

  const sections = report ? [
    { label: 'What\'s Working Well', content: report.workingWell, icon: '✅', bg: 'bg-green-50 border-green-200', text: 'text-green-900', head: 'text-green-800' },
    { label: 'What\'s Not Working', content: report.notWorking, icon: '⚠️', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-900', head: 'text-amber-800' },
    { label: 'Common Risks & Issues', content: report.commonRisks, icon: '🔴', bg: 'bg-red-50 border-red-200', text: 'text-red-900', head: 'text-red-800' },
    { label: 'Priority Actions This Week', content: report.priorityActions, icon: '🎯', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-900', head: 'text-purple-800' },
    { label: 'Forward Actions (2–4 weeks)', content: report.forwardActions, icon: '📅', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-900', head: 'text-blue-800' },
  ].filter(s => s.content) : []

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Banner header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-base">🤖</div>
            <div className="min-w-0">
              <div className="font-semibold text-white text-sm">AI Executive Summary</div>
              {report ? (
                <div className="text-xs text-slate-300 mt-0.5">
                  Last updated {formatDate(report.createdAt)} by {report.generatedByName}
                  {meta && ` · ${meta.totalTowers} towers · ${meta.ragCounts?.RED ?? 0} RED / ${meta.ragCounts?.AMBER ?? 0} AMBER / ${meta.ragCounts?.GREEN ?? 0} GREEN`}
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-0.5">No report generated yet</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {report && (
              <button
                onClick={() => setShowDetails(d => !d)}
                className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded border border-slate-500 hover:border-slate-300 transition-colors"
              >
                {showDetails ? '▲ Collapse' : '▼ Expand'}
              </button>
            )}
            {canRefresh && (
              <Button
                size="sm"
                onClick={onRefresh}
                loading={refreshing}
                className="bg-white text-slate-800 hover:bg-slate-100 border-0 font-semibold"
              >
                {refreshing ? 'Analysing…' : report ? '↻ Refresh AI Summary' : '✦ Generate AI Summary'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Generating state */}
      {refreshing && (
        <div className="px-5 py-8 text-center">
          <div className="inline-flex items-center gap-2 text-slate-600 text-sm">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            Querying live data and running Azure OpenAI analysis…
          </div>
        </div>
      )}

      {/* No report yet */}
      {!report && !refreshing && (
        <div className="px-5 py-8 text-center text-slate-400">
          {canRefresh
            ? <p className="text-sm">Click <strong className="text-slate-600">&ldquo;Generate AI Summary&rdquo;</strong> to analyse all live programme data with Azure OpenAI.</p>
            : <p className="text-sm">AI summary not yet generated. Ask an Admin or Exec user to generate one.</p>
          }
        </div>
      )}

      {/* Report content */}
      {report && !refreshing && showDetails && (
        <div className="p-5 space-y-4">
          {/* Executive summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Programme Summary</div>
            <p className="text-sm text-slate-800 leading-relaxed">{report.summary}</p>
          </div>

          {/* Detail sections */}
          {sections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sections.map(s => (
                <div key={s.label} className={`rounded-lg border p-4 ${s.bg}`}>
                  <div className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${s.head}`}>
                    <span>{s.icon}</span>{s.label}
                  </div>
                  <p className={`text-xs leading-relaxed whitespace-pre-line ${s.text}`}>{s.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsed summary-only state */}
      {report && !refreshing && !showDetails && (
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">{report.summary}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExecutiveDashboard() {
  const { session } = useSession()
  const queryClient = useQueryClient()
  const canRefresh = session?.role === 'ADMIN' || session?.role === 'EXEC'

  const { data: aiData } = useQuery<{ data: AiReportDTO | null }>({
    queryKey: ['ai-report'],
    queryFn: async () => {
      const res = await fetch('/api/ai/report')
      if (!res.ok) return { data: null }
      return res.json()
    },
  })

  const { mutate: generateReport, isPending: refreshing } = useMutation({
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
    const rag = twgRag === 'RED' || tcsRag === 'RED' ? 'RED' :
                twgRag === 'AMBER' || tcsRag === 'AMBER' ? 'AMBER' :
                (twgRag || tcsRag) ?? 'AMBER'
    acc[rag] = (acc[rag] ?? 0) + 1
    return acc
  }, {})

  const ragDonutData = (['GREEN', 'AMBER', 'RED'] as RAGStatus[]).map(r => ({
    rag: r, count: ragCounts[r] ?? 0, label: r,
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

        {/* ── AI Executive Summary ── always at top */}
        <AiExecutiveSummary
          report={aiData?.data ?? null}
          canRefresh={canRefresh}
          onRefresh={() => generateReport()}
          refreshing={refreshing}
        />

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
