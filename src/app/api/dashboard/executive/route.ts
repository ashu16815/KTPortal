import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normaliseWeekEnding } from '@/lib/utils'
import { calculateVariance, isVarianceFlagged } from '@/lib/scoring'

export async function GET() {
  try {
    const weekEnding = normaliseWeekEnding(new Date())

    const towers = await prisma.tower.findMany({
      orderBy: { name: 'asc' },
      include: {
        artefacts: true,
        _count: { select: { actions: { where: { status: { in: ['OPEN', 'IN_PROGRESS', 'OVERDUE'] } } } } },
      },
    })

    const weightsRow = await prisma.scoringWeights.findFirst()
    const varianceThreshold = weightsRow?.varianceThreshold ?? 20

    const pendingDecisions = await prisma.decision.count({ where: { status: 'PENDING' } })

    type TowerRow = (typeof towers)[number]
    const towerSummaries = await Promise.all(towers.map(async (tower: TowerRow) => {
      const [twgScore, tcsScore, trend, overdueActions] = await Promise.all([
        prisma.healthScoreHistory.findUnique({
          where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding, org: 'TWG' } },
        }),
        prisma.healthScoreHistory.findUnique({
          where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding, org: 'TCS' } },
        }),
        prisma.healthScoreHistory.findMany({
          where: { towerId: tower.id },
          orderBy: { weekEnding: 'asc' },
          take: 8,
        }),
        prisma.action.count({ where: { towerId: tower.id, status: 'OVERDUE' } }),
      ])

      const variance = twgScore && tcsScore ? calculateVariance(twgScore.totalScore, tcsScore.totalScore) : undefined
      const varianceFlagged = variance !== undefined ? isVarianceFlagged(variance, varianceThreshold) : false

      const totalArtefacts = tower.artefacts.length
      type ArtefactRow = (typeof tower.artefacts)[number]
      const uploadedArtefacts = tower.artefacts.filter((a: ArtefactRow) => a.uploaded).length
      const artefactCoverage = totalArtefacts > 0 ? uploadedArtefacts / totalArtefacts : 0

      const mapScore = (s: typeof twgScore) => s ? {
        ...s,
        weekEnding: s.weekEnding.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      } : undefined

      return {
        tower: { id: tower.id, name: tower.name, description: tower.description, createdAt: tower.createdAt.toISOString() },
        twgScore: mapScore(twgScore),
        tcsScore: mapScore(tcsScore),
        variance,
        varianceFlagged,
        latestWeekEnding: weekEnding.toISOString(),
        trend: trend.map((t: (typeof trend)[number]) => ({ ...t, weekEnding: t.weekEnding.toISOString(), createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
        overdueActions,
        pendingDecisions,
        artefactCoverage,
      }
    }))

    const totalSubmissions = await prisma.weeklySubmission.count()

    return NextResponse.json({
      data: {
        towers: towerSummaries,
        totalSubmissions,
        weekEnding: weekEnding.toISOString(),
        generatedAt: new Date().toISOString(),
      }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to load executive dashboard' } }, { status: 500 })
  }
}
