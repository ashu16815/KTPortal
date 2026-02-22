import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normaliseWeekEnding, safeParseJSON } from '@/lib/utils'
import { calculateVariance, isVarianceFlagged } from '@/lib/scoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const towerId = searchParams.get('towerId')
    const weekEndingStr = searchParams.get('weekEnding')

    if (!towerId) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'towerId required' } }, { status: 400 })
    }

    const weekEnding = weekEndingStr ? normaliseWeekEnding(weekEndingStr) : normaliseWeekEnding(new Date())

    const tower = await prisma.tower.findUnique({ where: { id: towerId } })
    if (!tower) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Tower not found' } }, { status: 404 })

    const [twgSub, tcsSub] = await Promise.all([
      prisma.weeklySubmission.findUnique({
        where: { towerId_weekEnding_org: { towerId, weekEnding, org: 'TWG' } },
      }),
      prisma.weeklySubmission.findUnique({
        where: { towerId_weekEnding_org: { towerId, weekEnding, org: 'TCS' } },
      }),
    ])

    const weightsRow = await prisma.scoringWeights.findFirst()
    const varianceThreshold = weightsRow?.varianceThreshold ?? 20

    const mapSub = (s: typeof twgSub) => s ? {
      ...s,
      weekEnding: s.weekEnding.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      risks: safeParseJSON<string[]>(s.risks, []),
      blockers: safeParseJSON<string[]>(s.blockers, []),
      evidenceLinks: safeParseJSON<string[]>(s.evidenceLinks, []),
    } : undefined

    const variance = twgSub && tcsSub ? calculateVariance(twgSub.totalScore, tcsSub.totalScore) : undefined
    const varianceFlagged = variance !== undefined ? isVarianceFlagged(variance, varianceThreshold) : false

    return NextResponse.json({
      data: {
        tower: { id: tower.id, name: tower.name, description: tower.description, createdAt: tower.createdAt.toISOString() },
        weekEnding: weekEnding.toISOString(),
        twg: mapSub(twgSub),
        tcs: mapSub(tcsSub),
        variance,
        varianceFlagged,
      }
    })
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to compare submissions' } }, { status: 500 })
  }
}
