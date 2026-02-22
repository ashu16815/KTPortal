'use client'

import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { RAGBadge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import type { GroupSummary, RAGStatus, TowerHealthSummary } from '@/types'
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

function RAGPill({ count, rag }: { count: number; rag: string }) {
  const colors: Record<string, string> = { RED: 'bg-red-100 text-red-700', AMBER: 'bg-amber-100 text-amber-700', GREEN: 'bg-green-100 text-green-700' }
  if (count === 0) return null
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[rag]}`}>{count} {rag}</span>
}

function TowerRow({ t }: { t: TowerHealthSummary }) {
  const rag = (t.twgScore?.ragStatus === 'RED' || t.tcsScore?.ragStatus === 'RED') ? 'RED'
    : (t.twgScore?.ragStatus === 'AMBER' || t.tcsScore?.ragStatus === 'AMBER') ? 'AMBER'
    : (t.twgScore?.ragStatus || t.tcsScore?.ragStatus) as RAGStatus | undefined

  return (
    <Link href={`/dashboard/tower/${t.tower.id}`} className="block hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: rag === 'RED' ? '#ef4444' : rag === 'AMBER' ? '#f59e0b' : rag === 'GREEN' ? '#22c55e' : '#d1d5db' }} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{t.tower.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {t.tower.twgLeadName && <span className="text-xs text-gray-400 truncate">TWG: {t.tower.twgLeadName}</span>}
            {t.tower.tcsLeadName && <span className="text-xs text-gray-400 truncate">TCS: {t.tower.tcsLeadName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {t.tower.ktPhase && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PHASE_COLOR[t.tower.ktPhase] ?? 'bg-gray-100 text-gray-600'}`}>
              {PHASE_LABEL[t.tower.ktPhase] ?? t.tower.ktPhase}
            </span>
          )}
          <div className="text-center w-10">
            <div className="text-sm font-bold text-gray-900">{t.twgScore?.totalScore ?? '—'}</div>
            <div className="text-xs text-gray-400">TWG</div>
          </div>
          <div className="text-center w-10">
            <div className="text-sm font-bold text-gray-900">{t.tcsScore?.totalScore ?? '—'}</div>
            <div className="text-xs text-gray-400">TCS</div>
          </div>
          {t.varianceFlagged && <span className="text-xs text-orange-500 font-medium">⚠Δ</span>}
          {t.overdueActions > 0 && <span className="text-xs text-red-500 font-medium">⚠{t.overdueActions}</span>}
          {rag && <RAGBadge rag={rag} />}
        </div>
      </div>
    </Link>
  )
}

function GroupCard({ gs }: { gs: GroupSummary }) {
  const totalTowers = gs.towers.length
  const totalRed = gs.ragCounts.RED

  return (
    <Card className="overflow-hidden">
      <div className="bg-slate-800 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-base">{gs.group.name}</div>
            {gs.group.transitionPartnerTWG && (
              <div className="text-xs text-slate-300 mt-0.5">TWG: {gs.group.transitionPartnerTWG}</div>
            )}
            {gs.group.transitionManagerTCS && (
              <div className="text-xs text-slate-400 truncate max-w-xs">TCS: {gs.group.transitionManagerTCS}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{totalTowers}</div>
            <div className="text-xs text-slate-400">towers</div>
          </div>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <RAGPill count={gs.ragCounts.RED} rag="RED" />
          <RAGPill count={gs.ragCounts.AMBER} rag="AMBER" />
          <RAGPill count={gs.ragCounts.GREEN} rag="GREEN" />
          {gs.overdueActions > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-900 text-red-200">⚠ {gs.overdueActions} overdue</span>}
          {gs.atRiskMilestones > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-900 text-amber-200">{gs.atRiskMilestones} milestones at risk</span>}
          {gs.openRaidds > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900 text-blue-200">{gs.openRaidds} open RAIDD</span>}
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {gs.towers.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">No towers in this group</p>
        ) : (
          gs.towers.map(t => <TowerRow key={t.tower.id} t={t} />)
        )}
      </div>
      {totalRed > 0 && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-700 font-medium">
          ⛔ {totalRed} tower{totalRed > 1 ? 's' : ''} RED — action required
        </div>
      )}
    </Card>
  )
}

export default function ProgrammeDashboard() {
  const { data, isLoading, error } = useQuery<{ data: GroupSummary[] }>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await fetch('/api/groups')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const groups = data?.data ?? []
  const allTowers = groups.flatMap(g => g.towers)
  const totalRed = groups.reduce((s, g) => s + g.ragCounts.RED, 0)
  const totalAmber = groups.reduce((s, g) => s + g.ragCounts.AMBER, 0)
  const totalGreen = groups.reduce((s, g) => s + g.ragCounts.GREEN, 0)
  const totalOverdue = groups.reduce((s, g) => s + g.overdueActions, 0)
  const totalRaiddOpen = groups.reduce((s, g) => s + g.openRaidds, 0)
  const reportDate = allTowers[0]?.latestWeekEnding

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>
  if (error) return <AppShell><div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Failed to load programme dashboard.</div></AppShell>

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Programme Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Project Ora — KT Operating Model{reportDate ? ` · Week ending ${formatDate(reportDate)}` : ''}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">{allTowers.length} towers</span>
            {totalRed > 0 && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">{totalRed} RED</span>}
            {totalAmber > 0 && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">{totalAmber} AMBER</span>}
            {totalGreen > 0 && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">{totalGreen} GREEN</span>}
          </div>
        </div>

        {/* Programme-level summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Towers', value: allTowers.length, color: 'text-gray-900' },
            { label: 'RED / At Risk', value: totalRed, color: 'text-red-600' },
            { label: 'Overdue Actions', value: totalOverdue, color: totalOverdue > 0 ? 'text-red-600' : 'text-green-600' },
            { label: 'Open RAIDD Items', value: totalRaiddOpen, color: totalRaiddOpen > 0 ? 'text-amber-600' : 'text-green-600' },
          ].map(s => (
            <Card key={s.label} className="text-center py-3">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Operating rhythm info */}
        <Card>
          <CardHeader><CardTitle>Transition Operating Rhythm</CardTitle></CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Operational (Daily)</div>
              <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-600">Daily KT Check-in</span><span className="text-gray-500 font-medium">4:00PM NZT</span></div>
              <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-600">Daily Governance Call</span><span className="text-gray-500 font-medium">4:30PM NZT</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600">RAID Log Review</span><span className="text-gray-500 font-medium">Daily (Governance)</span></div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Tactical (Weekly)</div>
              <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-600">Group 1 Program Review</span><span className="text-gray-500 font-medium">Wed 3PM NZT</span></div>
              <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-600">Group 2 Program Review</span><span className="text-gray-500 font-medium">Thu 3PM NZT</span></div>
              <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-600">Group 3 Program Review</span><span className="text-gray-500 font-medium">Fri 3PM NZT</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600">ELT Weekly Update</span><span className="text-gray-500 font-medium">Wed 15min</span></div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Strategic (Monthly)</div>
              <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-600">Steering Committee</span><span className="text-gray-500 font-medium">Monthly 1hr</span></div>
              <div className="flex justify-between py-1"><span className="text-gray-600">Org Change Management</span><span className="text-gray-500 font-medium">Fortnightly Thu</span></div>
            </div>
          </div>
        </Card>

        {/* Group cards */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {groups.map(gs => <GroupCard key={gs.group.id} gs={gs} />)}
        </div>

        {/* Quick links */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/raidd" className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">RAIDD Log →</Link>
          <Link href="/milestones" className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">Milestones →</Link>
          <Link href="/actions" className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">Actions Register →</Link>
          <Link href="/dashboard/executive" className="px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Executive View →</Link>
        </div>
      </div>
    </AppShell>
  )
}
