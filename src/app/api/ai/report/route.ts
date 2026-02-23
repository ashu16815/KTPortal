import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { getAIProvider } from '@/lib/ai'
import { safeParseJSON } from '@/lib/utils'

// GET /api/ai/report — return the latest saved AI report
export async function GET() {
  try {
    const report = await prisma.aiReport.findFirst({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: report ?? null })
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch report' } }, { status: 500 })
  }
}

// POST /api/ai/report — generate a new programme-level AI report and save it
export async function POST(_request: NextRequest) {
  try {
    const session = await requireSession()
    if (session.role !== 'ADMIN' && session.role !== 'EXEC') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin or Exec access required' } }, { status: 403 })
    }

    // ── 1. Aggregate live data from DB ──────────────────────────────────────

    const towers = await prisma.tower.findMany({
      include: { group: { select: { name: true } } },
    })

    // Latest week ending across all submissions
    const latestSub = await prisma.weeklySubmission.findFirst({ orderBy: { weekEnding: 'desc' }, select: { weekEnding: true } })
    const weekEnding = latestSub?.weekEnding ?? new Date()
    const weekStr = weekEnding.toISOString().slice(0, 10)

    // Latest TWG + TCS score per tower for that week
    const weekSubmissions = await prisma.weeklySubmission.findMany({
      where: { weekEnding },
      select: {
        towerId: true, org: true, totalScore: true, ragStatus: true,
        narrative: true, risks: true, blockers: true,
        progressScore: true, coverageScore: true, confidenceScore: true,
        operationalScore: true, qualityScore: true,
      },
    })

    const towerInputs = towers.map(t => {
      const twg = weekSubmissions.find(s => s.towerId === t.id && s.org === 'TWG')
      const tcs = weekSubmissions.find(s => s.towerId === t.id && s.org === 'TCS')
      const rag = twg?.ragStatus === 'RED' || tcs?.ragStatus === 'RED' ? 'RED'
        : twg?.ragStatus === 'AMBER' || tcs?.ragStatus === 'AMBER' ? 'AMBER'
        : (twg?.ragStatus || tcs?.ragStatus) ?? null
      return {
        name: t.name,
        group: t.group?.name ?? '',
        phase: t.ktPhase ?? '',
        twgScore: twg?.totalScore ?? null,
        tcsScore: tcs?.totalScore ?? null,
        ragStatus: rag,
        overdueActions: 0, // filled below
        openRaidds: 0,
        narrative: twg?.narrative ?? tcs?.narrative ?? null,
        risks: [...safeParseJSON<string[]>(twg?.risks, []), ...safeParseJSON<string[]>(tcs?.risks, [])],
        blockers: [...safeParseJSON<string[]>(twg?.blockers, []), ...safeParseJSON<string[]>(tcs?.blockers, [])],
      }
    })

    // Overdue actions per tower
    const now = new Date()
    const overdueRaw = await prisma.action.findMany({
      where: { status: { not: 'DONE' }, dueDate: { lt: now } },
      include: { tower: { select: { name: true } } },
    })
    const overdueCounts: Record<string, number> = {}
    overdueRaw.forEach(a => { overdueCounts[a.towerId] = (overdueCounts[a.towerId] ?? 0) + 1 })
    towerInputs.forEach(t => {
      const tower = towers.find(tw => tw.name === t.name)
      if (tower) t.overdueActions = overdueCounts[tower.id] ?? 0
    })

    // Open RAIDD items per tower
    const raiddRaw = await prisma.raiddLog.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } },
      include: { tower: { select: { name: true } } },
      orderBy: { impact: 'asc' },
      take: 20,
    })
    const raiddCounts: Record<string, number> = {}
    raiddRaw.forEach(r => { if (r.towerId) raiddCounts[r.towerId] = (raiddCounts[r.towerId] ?? 0) + 1 })
    towerInputs.forEach(t => {
      const tower = towers.find(tw => tw.name === t.name)
      if (tower) t.openRaidds = raiddCounts[tower.id] ?? 0
    })

    // At-risk milestones
    const atRiskMilestones = await prisma.milestone.findMany({
      where: { status: { in: ['AT_RISK', 'DELAYED', 'BLOCKED'] } },
      include: { tower: { select: { name: true } } },
      take: 15,
    })

    // Recent pulse comments
    const pulseRaw = await prisma.pulseResponse.findMany({
      where: { comment: { not: null } },
      include: {
        track: { select: { name: true } },
        submission: { include: { tower: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const ragCounts = { RED: 0, AMBER: 0, GREEN: 0 }
    towerInputs.forEach(t => {
      if (t.ragStatus === 'RED') ragCounts.RED++
      else if (t.ragStatus === 'AMBER') ragCounts.AMBER++
      else if (t.ragStatus === 'GREEN') ragCounts.GREEN++
    })

    // ── 2. Call AI ───────────────────────────────────────────────────────────

    const ai = getAIProvider()
    const report = await ai.generateProgrammeReport({
      weekEnding: weekStr,
      totalTowers: towers.length,
      ragCounts,
      towers: towerInputs,
      topRaidds: raiddRaw.slice(0, 10).map(r => ({
        type: r.type,
        title: r.title,
        impact: r.impact ?? 'MEDIUM',
        towerName: (r as { tower: { name: string } }).tower.name,
      })),
      overdueActions: overdueRaw.slice(0, 10).map(a => ({
        title: a.title,
        priority: a.priority,
        towerName: (a as { tower: { name: string } }).tower.name,
      })),
      atRiskMilestones: atRiskMilestones.map(m => ({
        name: m.name,
        status: m.status,
        towerName: (m as { tower: { name: string } }).tower.name,
      })),
      pulseComments: pulseRaw.filter(p => p.comment).map(p => ({
        track: p.track.name,
        comment: p.comment!,
        towerName: p.submission.tower.name,
      })),
    })

    // ── 3. Save to DB ────────────────────────────────────────────────────────

    const saved = await prisma.aiReport.create({
      data: {
        generatedById: session.id,
        generatedByName: session.name,
        summary: report.summary,
        workingWell: report.workingWell,
        notWorking: report.notWorking,
        commonRisks: report.commonRisks,
        priorityActions: report.priorityActions,
        forwardActions: report.forwardActions,
        metadata: JSON.stringify({
          weekEnding: weekStr,
          totalTowers: towers.length,
          ragCounts,
          overdueCount: overdueRaw.length,
          openRaiddCount: raiddRaw.length,
        }),
      },
    })

    return NextResponse.json({ data: saved }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    console.error('[ai/report]', err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Report generation failed' } }, { status: 500 })
  }
}
