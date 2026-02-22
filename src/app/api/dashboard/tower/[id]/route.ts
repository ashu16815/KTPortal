import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normaliseWeekEnding, safeParseJSON } from '@/lib/utils'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const weekEndingStr = searchParams.get('weekEnding')
    const weekEnding = weekEndingStr ? normaliseWeekEnding(weekEndingStr) : normaliseWeekEnding(new Date())

    const tower = await prisma.tower.findUnique({ where: { id } })
    if (!tower) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Tower not found' } }, { status: 404 })

    const [tracks, latestTwg, latestTcs, trend, actions, artefacts, pendingDecisions] = await Promise.all([
      prisma.track.findMany({ where: { towerId: id }, orderBy: { name: 'asc' } }),
      prisma.weeklySubmission.findUnique({ where: { towerId_weekEnding_org: { towerId: id, weekEnding, org: 'TWG' } } }),
      prisma.weeklySubmission.findUnique({ where: { towerId_weekEnding_org: { towerId: id, weekEnding, org: 'TCS' } } }),
      prisma.healthScoreHistory.findMany({ where: { towerId: id }, orderBy: { weekEnding: 'asc' }, take: 8 }),
      prisma.action.findMany({ where: { towerId: id }, include: { owner: { select: { name: true } }, tower: { select: { name: true } } }, orderBy: { dueDate: 'asc' } }),
      prisma.artefact.findMany({ where: { towerId: id }, orderBy: { type: 'asc' } }),
      prisma.decision.findMany({ where: { towerId: id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
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
        tower: { id: tower.id, name: tower.name, description: tower.description, createdAt: tower.createdAt.toISOString() },
        tracks,
        latestTwg: mapSub(latestTwg),
        latestTcs: mapSub(latestTcs),
        trend: trend.map((t: (typeof trend)[number]) => ({ ...t, weekEnding: t.weekEnding.toISOString(), createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
        actions: actions.map((a: (typeof actions)[number]) => ({
          ...a,
          ownerName: a.owner.name,
          towerName: a.tower.name,
          dueDate: a.dueDate?.toISOString(),
          resolvedAt: a.resolvedAt?.toISOString(),
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
          owner: undefined,
          tower: undefined,
        })),
        artefacts: artefacts.map((a: (typeof artefacts)[number]) => ({ ...a, uploadedAt: a.uploadedAt?.toISOString(), createdAt: a.createdAt.toISOString() })),
        pendingDecisions: pendingDecisions.map((d: (typeof pendingDecisions)[number]) => ({ ...d, decidedAt: d.decidedAt?.toISOString(), createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString() })),
        weekEnding: weekEnding.toISOString(),
      }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to load tower dashboard' } }, { status: 500 })
  }
}
