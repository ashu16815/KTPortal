'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { RAGBadge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PulseTrend } from '@/components/charts/PulseTrend'
import { ComponentRadar } from '@/components/charts/ComponentRadar'
import { queryKeys } from '@/hooks/queryKeys'
import { formatDate, formatScore } from '@/lib/utils'
import type { TowerDashboardPayload, ActionDTO, WeeklySubmissionDTO, RaiddDTO, MilestoneDTO } from '@/types'
import Link from 'next/link'

const PHASE_LABEL: Record<string, string> = {
  PLAN: 'Planning', KT: 'KT', VOLUME_RAMP_UP: 'Vol. Ramp Up',
  SS: 'Shadow Supervised', PS: 'Parallel Support', OJT: 'OJT', VRU: 'VRU', COMPLETE: 'Complete',
}
const PHASE_COLOR: Record<string, string> = {
  PLAN: 'bg-gray-100 text-gray-600', KT: 'bg-blue-100 text-blue-700',
  VOLUME_RAMP_UP: 'bg-purple-100 text-purple-700', SS: 'bg-amber-100 text-amber-700',
  PS: 'bg-orange-100 text-orange-700', OJT: 'bg-teal-100 text-teal-700',
  VRU: 'bg-indigo-100 text-indigo-700', COMPLETE: 'bg-green-100 text-green-700',
}
const MILESTONE_STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-gray-400', IN_PROGRESS: 'text-blue-500', COMPLETE: 'text-green-500',
  AT_RISK: 'text-amber-500', DELAYED: 'text-orange-500', BLOCKED: 'text-red-500',
}
const MILESTONE_DOT: Record<string, string> = {
  PENDING: 'bg-gray-300', IN_PROGRESS: 'bg-blue-400', COMPLETE: 'bg-green-500',
  AT_RISK: 'bg-amber-400', DELAYED: 'bg-orange-500', BLOCKED: 'bg-red-500',
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 text-gray-600 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-14 text-right font-medium text-gray-800 tabular-nums">{formatScore(value)}</span>
    </div>
  )
}

function SubmissionCard({ sub, label, colorClass }: { sub: WeeklySubmissionDTO; label: string; colorClass: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={colorClass}>{label} — {formatDate(sub.weekEnding)}</CardTitle>
          <RAGBadge rag={sub.ragStatus} />
        </div>
      </CardHeader>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold text-gray-900">{sub.totalScore}</span>
        <span className="text-lg text-gray-400 font-normal">/100</span>
      </div>
      <div className="space-y-2.5">
        <ScoreBar label="Progress" value={sub.progressScore} />
        <ScoreBar label="Coverage" value={sub.coverageScore} />
        <ScoreBar label="Confidence" value={sub.confidenceScore} />
        <ScoreBar label="Operational" value={sub.operationalScore} />
        <ScoreBar label="Quality" value={sub.qualityScore} />
      </div>
      {sub.hasActiveBlocker && (
        <div className="mt-3 text-xs bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-100">
          ⛔ Active blocker — score overridden to RED
        </div>
      )}
      {sub.aiSummary && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-xs font-medium text-blue-700 mb-1">
            AI Summary {sub.aiSummaryApproved ? '✓ Approved' : '(Draft)'}
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">{sub.aiSummary}</p>
        </div>
      )}
    </Card>
  )
}

export default function TowerDashboard({ params }: { params: Promise<{ towerId: string }> }) {
  const { towerId } = use(params)

  const { data, isLoading, error } = useQuery<{ data: TowerDashboardPayload }>({
    queryKey: queryKeys.towerDashboard(towerId),
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/tower/${towerId}`)
      if (!res.ok) throw new Error('Failed to load')
      return res.json()
    },
  })

  const payload = data?.data

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>
  if (error || !payload) return (
    <AppShell>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load tower dashboard.
      </div>
    </AppShell>
  )

  const { tower, latestTwg, latestTcs, trend, actions, artefacts, pendingDecisions, raidds, milestones } = payload
  const uploaded = artefacts.filter(a => a.uploaded).length
  const artefactPct = artefacts.length > 0 ? Math.round((uploaded / artefacts.length) * 100) : 0

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{tower.name}</h1>
              {tower.ktPhase && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${PHASE_COLOR[tower.ktPhase] ?? 'bg-gray-100 text-gray-600'}`}>
                  {PHASE_LABEL[tower.ktPhase] ?? tower.ktPhase}
                </span>
              )}
              {tower.groupName && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{tower.groupName}</span>
              )}
            </div>
            {tower.description && <p className="text-sm text-gray-500 mt-1">{tower.description}</p>}
            {(tower.twgLeadName || tower.tcsLeadName) && (
              <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                {tower.twgLeadName && <span>TWG: <span className="font-medium text-gray-700">{tower.twgLeadName}</span></span>}
                {tower.tcsLeadName && <span>TCS: <span className="font-medium text-gray-700">{tower.tcsLeadName}</span></span>}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/submissions/new?towerId=${tower.id}`}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Submit Update
            </Link>
            <Link
              href={`/submissions/compare?towerId=${tower.id}`}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Compare
            </Link>
          </div>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {latestTwg ? (
            <SubmissionCard sub={latestTwg} label="TWG Score" colorClass="text-blue-700" />
          ) : (
            <Card>
              <div className="text-center py-8">
                <div className="text-gray-300 text-3xl mb-2">📋</div>
                <div className="text-gray-500 text-sm">No TWG submission this week</div>
                <Link href={`/submissions/new?towerId=${tower.id}`} className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                  Submit now →
                </Link>
              </div>
            </Card>
          )}

          {latestTcs ? (
            <SubmissionCard sub={latestTcs} label="TCS Score" colorClass="text-green-700" />
          ) : (
            <Card>
              <div className="text-center py-8">
                <div className="text-gray-300 text-3xl mb-2">📋</div>
                <div className="text-gray-500 text-sm">No TCS submission this week</div>
              </div>
            </Card>
          )}
        </div>

        {/* Radar + Trend */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Component Comparison</CardTitle></CardHeader>
            <ComponentRadar twg={latestTwg ?? undefined} tcs={latestTcs ?? undefined} />
          </Card>
          <Card>
            <CardHeader><CardTitle>8-Week Health Trend</CardTitle></CardHeader>
            {trend.length > 0 ? (
              <PulseTrend trend={trend} />
            ) : (
              <div className="text-gray-400 text-sm py-8 text-center">No trend data yet</div>
            )}
          </Card>
        </div>

        {/* Narrative */}
        {(latestTwg?.narrative || latestTcs?.narrative) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestTwg?.narrative && (
              <Card>
                <CardHeader><CardTitle>TWG Narrative</CardTitle></CardHeader>
                <p className="text-sm text-gray-700 leading-relaxed">{latestTwg.narrative}</p>
                {Array.isArray(latestTwg.risks) && latestTwg.risks.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Risks</div>
                    <ul className="space-y-1">
                      {latestTwg.risks.map((r, i) => <li key={i} className="text-xs text-amber-700 flex gap-1"><span>⚠</span>{r}</li>)}
                    </ul>
                  </div>
                )}
              </Card>
            )}
            {latestTcs?.narrative && (
              <Card>
                <CardHeader><CardTitle>TCS Narrative</CardTitle></CardHeader>
                <p className="text-sm text-gray-700 leading-relaxed">{latestTcs.narrative}</p>
                {Array.isArray(latestTcs.risks) && latestTcs.risks.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Risks</div>
                    <ul className="space-y-1">
                      {latestTcs.risks.map((r, i) => <li key={i} className="text-xs text-amber-700 flex gap-1"><span>⚠</span>{r}</li>)}
                    </ul>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Actions / Artefacts / Decisions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Actions</CardTitle>
                <Link href="/actions" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
            </CardHeader>
            {actions.length === 0 ? (
              <p className="text-sm text-gray-400">No actions</p>
            ) : (
              <ul className="space-y-2.5">
                {actions.slice(0, 5).map((a: ActionDTO) => (
                  <li key={a.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-gray-700 leading-tight">{a.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-medium ${
                        a.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                        a.status === 'DONE' ? 'bg-green-100 text-green-700' :
                        a.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{a.status}</span>
                    </div>
                    {a.dueDate && (
                      <div className={`text-xs mt-0.5 ${new Date(a.dueDate) < new Date() && a.status !== 'DONE' ? 'text-red-500' : 'text-gray-400'}`}>
                        Due {formatDate(a.dueDate)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Artefacts ({artefactPct}% complete)</CardTitle>
            </CardHeader>
            <div className="mb-3">
              <div className="bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${artefactPct >= 80 ? 'bg-green-500' : artefactPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${artefactPct}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">{uploaded} of {artefacts.length} uploaded</div>
            </div>
            {artefacts.length === 0 ? (
              <p className="text-sm text-gray-400">No artefacts defined</p>
            ) : (
              <ul className="space-y-1.5">
                {artefacts.map(a => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <span className={a.uploaded ? 'text-green-500' : 'text-gray-300'}>{a.uploaded ? '✓' : '○'}</span>
                    <span className={a.uploaded ? 'text-gray-700' : 'text-gray-400 italic'}>{a.name}</span>
                    <span className="text-xs text-gray-300 ml-auto">{a.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>Pending Decisions</CardTitle></CardHeader>
            {pendingDecisions.length === 0 ? (
              <p className="text-sm text-gray-400">✓ No pending decisions</p>
            ) : (
              <ul className="space-y-3">
                {pendingDecisions.map((d: RaiddDTO) => (
                  <li key={d.id} className="text-sm border-b border-gray-50 pb-3 last:border-0">
                    <div className="font-medium text-gray-800 leading-tight">{d.title}</div>
                    {d.description && <div className="text-xs text-gray-400 mt-1 leading-relaxed">{d.description}</div>}
                    <div className="text-xs text-amber-600 mt-1 font-medium">PENDING DECISION</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* RAIDD summary */}
        {raidds && raidds.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>RAIDD Items</CardTitle>
                <Link href="/raidd" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <div className="space-y-2">
              {raidds.slice(0, 6).map((r: RaiddDTO) => (
                <div key={r.id} className="flex items-start gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {r.type === 'RISK' ? '⚠️' : r.type === 'ISSUE' ? '🔴' : r.type === 'DEPENDENCY' ? '🔗' : r.type === 'DECISION' ? '🔷' : '💡'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 leading-tight truncate">{r.title}</div>
                    {r.mitigation && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.mitigation}</div>}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-medium ${
                    r.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                    r.status === 'ESCALATED' ? 'bg-orange-100 text-orange-700' :
                    r.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{r.status}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Milestones */}
        {milestones && milestones.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Milestones</CardTitle>
                <Link href="/milestones" className="text-xs text-blue-600 hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <div className="space-y-1">
              {milestones.map((m: MilestoneDTO) => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${MILESTONE_DOT[m.status] ?? 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{m.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{m.phase}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Planned {formatDate(m.plannedDate)}
                      {m.actualDate && <span className="text-green-600 ml-1">· Done {formatDate(m.actualDate)}</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ${MILESTONE_STATUS_COLOR[m.status] ?? 'text-gray-400'}`}>
                    {m.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
