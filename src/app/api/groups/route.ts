import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normaliseWeekEnding } from '@/lib/utils'
import { calculateVariance, isVarianceFlagged } from '@/lib/scoring'

export async function GET() {
  try {
    const weekEnding = normaliseWeekEnding(new Date())
    const weightsRow = await prisma.scoringWeights.findFirst()
    const varianceThreshold = weightsRow?.varianceThreshold ?? 20

    const groups = await prisma.towerGroup.findMany({
      orderBy: { groupNumber: 'asc' },
      include: {
        towers: {
          include: { artefacts: true },
          orderBy: { name: 'asc' },
        },
      },
    })

    const result = await Promise.all(groups.map(async group => {
      const towerSummaries = await Promise.all(group.towers.map(async tower => {
        const [twgScore, tcsScore, trend, overdueActions, openRaidds] = await Promise.all([
          prisma.healthScoreHistory.findUnique({ where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding, org: 'TWG' } } }),
          prisma.healthScoreHistory.findUnique({ where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding, org: 'TCS' } } }),
          prisma.healthScoreHistory.findMany({ where: { towerId: tower.id }, orderBy: { weekEnding: 'asc' }, take: 8 }),
          prisma.action.count({ where: { towerId: tower.id, status: 'OVERDUE' } }),
          prisma.raiddLog.count({ where: { towerId: tower.id, status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } }),
        ])

        const variance = twgScore && tcsScore ? calculateVariance(twgScore.totalScore, tcsScore.totalScore) : undefined
        const varianceFlagged = variance !== undefined ? isVarianceFlagged(variance, varianceThreshold) : false
        const uploadedArtefacts = tower.artefacts.filter(a => a.uploaded).length
        const artefactCoverage = tower.artefacts.length > 0 ? uploadedArtefacts / tower.artefacts.length : 0

        const mapScore = (s: typeof twgScore) => s ? { ...s, weekEnding: s.weekEnding.toISOString(), createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() } : undefined

        return {
          tower: {
            id: tower.id, name: tower.name, description: tower.description,
            groupId: tower.groupId, groupName: group.name, groupNumber: group.groupNumber,
            ktPhase: tower.ktPhase, ktModel: tower.ktModel,
            twgLeadName: tower.twgLeadName, tcsLeadName: tower.tcsLeadName,
            createdAt: tower.createdAt.toISOString(),
          },
          twgScore: mapScore(twgScore),
          tcsScore: mapScore(tcsScore),
          variance, varianceFlagged,
          latestWeekEnding: weekEnding.toISOString(),
          trend: trend.map(t => ({ ...t, weekEnding: t.weekEnding.toISOString(), createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
          overdueActions,
          pendingDecisions: openRaidds,
          artefactCoverage,
        }
      }))

      const ragCounts = towerSummaries.reduce((acc, t) => {
        const rag = t.twgScore?.ragStatus === 'RED' || t.tcsScore?.ragStatus === 'RED' ? 'RED'
          : t.twgScore?.ragStatus === 'AMBER' || t.tcsScore?.ragStatus === 'AMBER' ? 'AMBER'
          : (t.twgScore?.ragStatus || t.tcsScore?.ragStatus) ?? 'AMBER'
        acc[rag as 'RED' | 'AMBER' | 'GREEN'] = (acc[rag as 'RED' | 'AMBER' | 'GREEN'] ?? 0) + 1
        return acc
      }, { RED: 0, AMBER: 0, GREEN: 0 })

      const atRiskMilestones = await prisma.milestone.count({
        where: { towerId: { in: group.towers.map(t => t.id) }, status: { in: ['AT_RISK', 'DELAYED', 'BLOCKED'] } },
      })
      const openRaidds = await prisma.raiddLog.count({
        where: { towerId: { in: group.towers.map(t => t.id) }, status: { in: ['OPEN', 'ESCALATED'] } },
      })

      return {
        group: { id: group.id, groupNumber: group.groupNumber, name: group.name, transitionPartnerTWG: group.transitionPartnerTWG, transitionManagerTCS: group.transitionManagerTCS, description: group.description },
        towers: towerSummaries,
        ragCounts,
        overdueActions: towerSummaries.reduce((s, t) => s + t.overdueActions, 0),
        atRiskMilestones,
        openRaidds,
      }
    }))

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to load groups' } }, { status: 500 })
  }
}
