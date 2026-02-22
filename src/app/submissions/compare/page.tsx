'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { RAGBadge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { queryKeys } from '@/hooks/queryKeys'
import { getCurrentWeekEnding, formatDate, formatScore } from '@/lib/utils'
import type { ComparePayload, TowerDTO } from '@/types'

const COMPARE_FIELDS = [
  { label: 'Total Score', key: 'totalScore', render: (v: unknown) => <span className="font-bold text-gray-900">{String(v)}/100</span> },
  { label: 'RAG Status', key: 'ragStatus', render: (v: unknown) => <RAGBadge rag={v as 'RED' | 'AMBER' | 'GREEN'} /> },
  { label: 'Progress', key: 'progressScore', render: (v: unknown) => formatScore(v as number) },
  { label: 'Coverage', key: 'coverageScore', render: (v: unknown) => formatScore(v as number) },
  { label: 'Confidence', key: 'confidenceScore', render: (v: unknown) => formatScore(v as number) },
  { label: 'Operational', key: 'operationalScore', render: (v: unknown) => formatScore(v as number) },
  { label: 'Quality', key: 'qualityScore', render: (v: unknown) => formatScore(v as number) },
  { label: 'Active Blocker', key: 'hasActiveBlocker', render: (v: unknown) => v ? <span className="text-red-600">⛔ Yes</span> : <span className="text-green-600">✓ No</span> },
]

function CompareContent() {
  const searchParams = useSearchParams()
  const [towerId, setTowerId] = useState(searchParams.get('towerId') ?? '')
  const weekEnding = getCurrentWeekEnding().toISOString()

  const { data: towersData } = useQuery<{ data: TowerDTO[] }>({
    queryKey: queryKeys.towers(),
    queryFn: async () => { const r = await fetch('/api/towers'); return r.json() },
  })

  const { data, isLoading } = useQuery<{ data: ComparePayload }>({
    queryKey: queryKeys.compare(towerId, weekEnding),
    queryFn: async () => {
      const r = await fetch(`/api/submissions/compare?towerId=${towerId}&weekEnding=${encodeURIComponent(weekEnding)}`)
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    enabled: !!towerId,
  })

  const payload = data?.data

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Select Tower</CardTitle></CardHeader>
        <select
          value={towerId}
          onChange={e => setTowerId(e.target.value)}
          className="block w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a tower...</option>
          {(towersData?.data ?? []).map((t: TowerDTO) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Card>

      {isLoading && towerId && <LoadingSpinner />}

      {!towerId && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">⚖️</div>
          <p>Select a tower above to compare TWG and TCS submissions</p>
        </div>
      )}

      {payload && (
        <>
          {payload.varianceFlagged && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
              <span className="text-orange-500 text-xl flex-shrink-0">⚠</span>
              <div>
                <div className="font-semibold text-orange-800">High Variance Detected</div>
                <div className="text-sm text-orange-700 mt-0.5">
                  Delta of <strong>{payload.variance} points</strong> between TWG and TCS exceeds the threshold of 20 points. Executive review recommended.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {/* Field labels */}
            <div className="space-y-px">
              <div className="h-16 flex items-end pb-2">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">Field</div>
              </div>
              {COMPARE_FIELDS.map(f => (
                <div key={f.key} className="h-11 flex items-center text-sm font-medium text-gray-500 px-2">
                  {f.label}
                </div>
              ))}
            </div>

            {/* TWG */}
            <Card padding={false} className="overflow-hidden">
              <div className="bg-blue-600 px-4 py-3">
                <div className="font-semibold text-white">TWG</div>
                <div className="text-xs text-blue-200">{payload.twg?.status ?? 'No submission'}</div>
              </div>
              <div className="p-2">
                {payload.twg ? (
                  COMPARE_FIELDS.map(f => {
                    const val = (payload.twg as Record<string, unknown>)?.[f.key]
                    const tcsVal = (payload.tcs as Record<string, unknown>)?.[f.key]
                    const differs = payload.tcs && String(val) !== String(tcsVal) && f.key !== 'ragStatus'
                    return (
                      <div key={f.key} className={`h-11 flex items-center px-2 text-sm rounded-lg ${differs ? 'bg-orange-50' : ''}`}>
                        {f.render ? f.render(val) : String(val ?? '—')}
                        {differs && <span className="ml-auto text-orange-400 text-xs">Δ</span>}
                      </div>
                    )
                  })
                ) : (
                  <div className="py-6 text-center text-gray-400 text-sm">No TWG submission this week</div>
                )}
              </div>
            </Card>

            {/* TCS */}
            <Card padding={false} className="overflow-hidden">
              <div className="bg-green-600 px-4 py-3">
                <div className="font-semibold text-white">TCS</div>
                <div className="text-xs text-green-200">{payload.tcs?.status ?? 'No submission'}</div>
              </div>
              <div className="p-2">
                {payload.tcs ? (
                  COMPARE_FIELDS.map(f => {
                    const val = (payload.tcs as Record<string, unknown>)?.[f.key]
                    const twgVal = (payload.twg as Record<string, unknown>)?.[f.key]
                    const differs = payload.twg && String(val) !== String(twgVal) && f.key !== 'ragStatus'
                    return (
                      <div key={f.key} className={`h-11 flex items-center px-2 text-sm rounded-lg ${differs ? 'bg-orange-50' : ''}`}>
                        {f.render ? f.render(val) : String(val ?? '—')}
                        {differs && <span className="ml-auto text-orange-400 text-xs">Δ</span>}
                      </div>
                    )
                  })
                ) : (
                  <div className="py-6 text-center text-gray-400 text-sm">No TCS submission this week</div>
                )}
              </div>
            </Card>
          </div>

          {/* Narratives */}
          {(payload.twg?.narrative || payload.tcs?.narrative) && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-blue-700">TWG Narrative</CardTitle></CardHeader>
                <p className="text-sm text-gray-700 leading-relaxed">{payload.twg?.narrative ?? '—'}</p>
                {Array.isArray(payload.twg?.blockers) && payload.twg.blockers.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-red-600 mb-1">Blockers</div>
                    {payload.twg.blockers.map((b, i) => <div key={i} className="text-xs text-red-700">⛔ {b}</div>)}
                  </div>
                )}
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-green-700">TCS Narrative</CardTitle></CardHeader>
                <p className="text-sm text-gray-700 leading-relaxed">{payload.tcs?.narrative ?? '—'}</p>
                {Array.isArray(payload.tcs?.blockers) && payload.tcs.blockers.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-red-600 mb-1">Blockers</div>
                    {payload.tcs.blockers.map((b, i) => <div key={i} className="text-xs text-red-700">⛔ {b}</div>)}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ComparePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submission Compare</h1>
          <p className="text-sm text-gray-500 mt-1">TWG vs TCS — Week ending {formatDate(getCurrentWeekEnding())}</p>
        </div>
        <Suspense fallback={<LoadingSpinner />}>
          <CompareContent />
        </Suspense>
      </div>
    </AppShell>
  )
}
