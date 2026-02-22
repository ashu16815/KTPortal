import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { calculateScore } from '@/lib/scoring'
import { writeAudit } from '@/lib/audit'

function handleAuthError(err: unknown) {
  if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
  }
  if (err instanceof Error && err.message === 'FORBIDDEN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 })
  }
  return null
}

export async function GET() {
  try {
    await requireRole(['ADMIN'])
    const weights = await prisma.scoringWeights.findFirst()
    if (!weights) {
      return NextResponse.json({
        data: {
          id: 'default',
          progressWeight: 0.25,
          coverageWeight: 0.25,
          confidenceWeight: 0.20,
          operationalWeight: 0.15,
          qualityWeight: 0.15,
          greenThreshold: 75,
          amberThreshold: 50,
          varianceThreshold: 20,
        }
      })
    }
    return NextResponse.json({ data: { ...weights, updatedAt: weights.updatedAt.toISOString() } })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed' } }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN'])
    const body = await request.json()

    const weights = await prisma.scoringWeights.upsert({
      where: { id: body.id ?? 'default' },
      create: {
        id: 'default',
        progressWeight: body.progressWeight,
        coverageWeight: body.coverageWeight,
        confidenceWeight: body.confidenceWeight,
        operationalWeight: body.operationalWeight,
        qualityWeight: body.qualityWeight,
        greenThreshold: body.greenThreshold ?? 75,
        amberThreshold: body.amberThreshold ?? 50,
        varianceThreshold: body.varianceThreshold ?? 20,
      },
      update: {
        progressWeight: body.progressWeight,
        coverageWeight: body.coverageWeight,
        confidenceWeight: body.confidenceWeight,
        operationalWeight: body.operationalWeight,
        qualityWeight: body.qualityWeight,
        greenThreshold: body.greenThreshold,
        amberThreshold: body.amberThreshold,
        varianceThreshold: body.varianceThreshold,
      },
    })

    // Rescore all history when weights change
    const allHistory = await prisma.healthScoreHistory.findMany({
      include: { tower: { include: { submissions: true } } }
    })

    type HistoryRow = (typeof allHistory)[number]
    for (const h of allHistory as HistoryRow[]) {
      type SubmissionRow = (typeof h.tower.submissions)[number]
      const sub = h.tower.submissions.find(
        (s: SubmissionRow) => s.org === h.org && s.weekEnding.getTime() === h.weekEnding.getTime()
      )
      if (!sub) continue
      const { totalScore, ragStatus } = calculateScore({
        progressScore: sub.progressScore,
        coverageScore: sub.coverageScore,
        confidenceScore: sub.confidenceScore,
        operationalScore: sub.operationalScore,
        qualityScore: sub.qualityScore,
        hasActiveBlocker: sub.hasActiveBlocker,
      }, weights)
      await prisma.healthScoreHistory.update({ where: { id: h.id }, data: { totalScore, ragStatus } })
    }

    await writeAudit({ userId: session.id, action: 'UPDATE', resource: 'weights', details: body })

    return NextResponse.json({ data: { ...weights, updatedAt: weights.updatedAt.toISOString() } })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update weights' } }, { status: 500 })
  }
}
