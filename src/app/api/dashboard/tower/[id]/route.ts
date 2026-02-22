import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normaliseWeekEnding, safeParseJSON } from '@/lib/utils'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const weekEndingStr = searchParams.get('weekEnding')
    const weekEnding = weekEndingStr ? normaliseWeekEnding(weekEndingStr) : normaliseWeekEnding(new Date())

    const tower = await prisma.tower.findUnique({ where: { id }, include: { group: true } })
    if (!tower) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Tower not found' } }, { status: 404 })

    const [tracks, latestTwg, latestTcs, trend, actions, artefacts, pendingDecisions, raidds, milestones] = await Promise.all([
      prisma.track.findMany({ where: { towerId: id }, orderBy: { name: 'asc' } }),
      prisma.weeklySubmission.findUnique({ where: { towerId_weekEnding_org: { towerId: id, weekEnding, org: 'TWG' } } }),
      prisma.weeklySubmission.findUnique({ where: { towerId_weekEnding_org: { towerId: id, weekEnding, org: 'TCS' } } }),
      prisma.healthScoreHistory.findMany({ where: { towerId: id }, orderBy: { weekEnding: 'asc' }, take: 8 }),
      prisma.action.findMany({ where: { towerId: id }, include: { owner: { select: { name: true } }, tower: { select: { name: true } } }, orderBy: { dueDate: 'asc' } }),
      prisma.artefact.findMany({ where: { towerId: id }, orderBy: { type: 'asc' } }),
      prisma.raiddLog.findMany({ where: { towerId: id, type: 'DECISION', status: { in: ['OPEN', 'ESCALATED'] } }, orderBy: { createdAt: 'desc' } }),
      prisma.raiddLog.findMany({ where: { towerId: id, status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } }, orderBy: [{ type: 'asc' }, { impact: 'asc' }] }),
      prisma.milestone.findMany({ where: { towerId: id }, orderBy: { plannedDate: 'asc' } }),
    ])

    const mapSub = (s: typeof latestTwg) => s ? {
      ...s,
      weekEnding: s.weekEnding.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      risks: safeParseJSON<string[]>(s.risks, []),
      blockers: safeParseJSON<string[]>(s.blockers, []),
      evidenceLinks: safeParseJSON<string[]>(s.evidenceLinks, []),
    } : undefined

    return NextResponse.json({
      data: {
        tower: {
          id: tower.id, name: tower.name, description: tower.description,
          groupId: tower.groupId ?? undefined,
          groupName: tower.group?.name,
          groupNumber: tower.group?.groupNumber,
          ktPhase: tower.ktPhase,
          ktModel: tower.ktModel ?? undefined,
          twgLeadName: tower.twgLeadName ?? undefined,
          tcsLeadName: tower.tcsLeadName ?? undefined,
          createdAt: tower.createdAt.toISOString(),
        },
        tracks,
        latestTwg: mapSub(latestTwg),
        latestTcs: mapSub(latestTcs),
        trend: trend.map(t => ({ ...t, weekEnding: t.weekEnding.toISOString(), createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
        actions: actions.map(a => ({
          ...a, ownerName: a.owner.name, towerName: a.tower.name,
          dueDate: a.dueDate?.toISOString(), resolvedAt: a.resolvedAt?.toISOString(),
          createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(),
          owner: undefined, tower: undefined,
        })),
        artefacts: artefacts.map(a => ({ ...a, uploadedAt: a.uploadedAt?.toISOString(), createdAt: a.createdAt.toISOString() })),
        pendingDecisions: pendingDecisions.map(d => ({ ...d, dueDate: d.dueDate?.toISOString(), closedAt: d.closedAt?.toISOString(), createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString() })),
        raidds: raidds.map(r => ({ ...r, dueDate: r.dueDate?.toISOString(), closedAt: r.closedAt?.toISOString(), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })),
        milestones: milestones.map(m => ({ ...m, plannedDate: m.plannedDate.toISOString(), actualDate: m.actualDate?.toISOString(), createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() })),
        weekEnding: weekEnding.toISOString(),
      }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to load tower dashboard' } }, { status: 500 })
  }
}
