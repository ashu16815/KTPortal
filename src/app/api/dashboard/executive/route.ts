import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normaliseWeekEnding } from '@/lib/utils'
import { calculateVariance, isVarianceFlagged } from '@/lib/scoring'

export async function GET() {
  try {
    const weekEnding = normaliseWeekEnding(new Date())
    const weightsRow = await prisma.scoringWeights.findFirst()
    const varianceThreshold = weightsRow?.varianceThreshold ?? 20

    const towers = await prisma.tower.findMany({
      orderBy: [{ groupId: 'asc' }, { name: 'asc' }],
      include: {
        artefacts: true,
        group: true,
        _count: { select: { actions: { where: { status: { in: ['OPEN', 'IN_PROGRESS', 'OVERDUE'] } } } } },
      },
    })

    type TowerRow = (typeof towers)[number]
    const towerSummaries = await Promise.all(towers.map(async (tower: TowerRow) => {
      const [twgScore, tcsScore, trend, overdueActions, pendingDecCount] = await Promise.all([
        prisma.healthScoreHistory.findUnique({ where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding, org: 'TWG' } } }),
        prisma.healthScoreHistory.findUnique({ where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding, org: 'TCS' } } }),
        prisma.healthScoreHistory.findMany({ where: { towerId: tower.id }, orderBy: { weekEnding: 'asc' }, take: 8 }),
        prisma.action.count({ where: { towerId: tower.id, status: 'OVERDUE' } }),
        prisma.raiddLog.count({ where: { towerId: tower.id, type: 'DECISION', status: { in: ['OPEN', 'ESCALATED'] } } }),
      ])

      const variance = twgScore && tcsScore ? calculateVariance(twgScore.totalScore, tcsScore.totalScore) : undefined
      const varianceFlagged = variance !== undefined ? isVarianceFlagged(variance, varianceThreshold) : false
      const uploadedArtefacts = tower.artefacts.filter(a => a.uploaded).length
      const artefactCoverage = tower.artefacts.length > 0 ? uploadedArtefacts / tower.artefacts.length : 0

      const mapScore = (s: typeof twgScore) => s ? { ...s, weekEnding: s.weekEnding.toISOString(), createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() } : undefined

      return {
        tower: {
          id: tower.id, name: tower.name, description: tower.description,
          groupId: tower.groupId ?? undefined,
          groupName: tower.group?.name,
          groupNumber: tower.group?.groupNumber,
          ktPhase: tower.ktPhase,
          twgLeadName: tower.twgLeadName ?? undefined,
          tcsLeadName: tower.tcsLeadName ?? undefined,
          createdAt: tower.createdAt.toISOString(),
        },
        twgScore: mapScore(twgScore),
        tcsScore: mapScore(tcsScore),
        variance, varianceFlagged,
        latestWeekEnding: weekEnding.toISOString(),
        trend: trend.map(t => ({ ...t, weekEnding: t.weekEnding.toISOString(), createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
        overdueActions,
        pendingDecisions: pendingDecCount,
        artefactCoverage,
      }
    }))

    // Build group summaries
    const groups = await prisma.towerGroup.findMany({ orderBy: { groupNumber: 'asc' } })
    const groupSummaries = await Promise.all(groups.map(async g => {
      const gTowers = towerSummaries.filter(t => t.tower.groupId === g.id)
      const ragCounts = gTowers.reduce((acc, t) => {
        const rag = t.twgScore?.ragStatus === 'RED' || t.tcsScore?.ragStatus === 'RED' ? 'RED'
          : t.twgScore?.ragStatus === 'AMBER' || t.tcsScore?.ragStatus === 'AMBER' ? 'AMBER'
          : (t.twgScore?.ragStatus || t.tcsScore?.ragStatus) ?? 'AMBER'
        acc[rag as 'RED' | 'AMBER' | 'GREEN'] = (acc[rag as 'RED' | 'AMBER' | 'GREEN'] ?? 0) + 1
        return acc
      }, { RED: 0, AMBER: 0, GREEN: 0 })

      const towerIds = gTowers.map(t => t.tower.id)
      const [atRiskMilestones, openRaidds] = await Promise.all([
        prisma.milestone.count({ where: { towerId: { in: towerIds }, status: { in: ['AT_RISK', 'DELAYED', 'BLOCKED'] } } }),
        prisma.raiddLog.count({ where: { towerId: { in: towerIds }, status: { in: ['OPEN', 'ESCALATED'] } } }),
      ])

      return {
        group: { id: g.id, groupNumber: g.groupNumber, name: g.name, transitionPartnerTWG: g.transitionPartnerTWG, transitionManagerTCS: g.transitionManagerTCS, description: g.description },
        towers: gTowers,
        ragCounts,
        overdueActions: gTowers.reduce((s, t) => s + t.overdueActions, 0),
        atRiskMilestones,
        openRaidds,
      }
    }))

    const totalSubmissions = await prisma.weeklySubmission.count()

    return NextResponse.json({
      data: {
        groups: groupSummaries,
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
