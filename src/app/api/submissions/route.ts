import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { calculateScore } from '@/lib/scoring'
import { getAIProvider } from '@/lib/ai'
import { writeAudit } from '@/lib/audit'
import { normaliseWeekEnding, safeParseJSON } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const towerId = searchParams.get('towerId')
    const org = searchParams.get('org')
    const weekEnding = searchParams.get('weekEnding')

    const submissions = await prisma.weeklySubmission.findMany({
      where: {
        ...(towerId ? { towerId } : {}),
        ...(org ? { org } : {}),
        ...(weekEnding ? { weekEnding: normaliseWeekEnding(weekEnding) } : {}),
      },
      include: { tower: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { weekEnding: 'desc' },
    })

    const mapped = submissions.map(s => ({
      ...s,
      weekEnding: s.weekEnding.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      risks: safeParseJSON<string[]>(s.risks, []),
      blockers: safeParseJSON<string[]>(s.blockers, []),
      evidenceLinks: safeParseJSON<string[]>(s.evidenceLinks, []),
    }))

    return NextResponse.json({ data: mapped })
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch submissions' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    const weekEnding = normaliseWeekEnding(body.weekEnding ?? new Date())

    const weightsRow = await prisma.scoringWeights.findFirst()

    const scoreInput = {
      progressScore: body.progressScore,
      coverageScore: body.coverageScore,
      confidenceScore: body.confidenceScore,
      operationalScore: body.operationalScore,
      qualityScore: body.qualityScore,
      hasActiveBlocker: body.hasActiveBlocker ?? false,
    }

    const { totalScore, ragStatus } = calculateScore(scoreInput, weightsRow ?? undefined)

    const submission = await prisma.weeklySubmission.upsert({
      where: { towerId_weekEnding_org: { towerId: body.towerId, weekEnding, org: session.org } },
      create: {
        towerId: body.towerId,
        userId: session.id,
        org: session.org,
        weekEnding,
        status: 'SUBMITTED',
        progressScore: body.progressScore,
        coverageScore: body.coverageScore,
        confidenceScore: body.confidenceScore,
        operationalScore: body.operationalScore,
        qualityScore: body.qualityScore,
        totalScore,
        ragStatus,
        narrative: body.narrative,
        risks: JSON.stringify(body.risks ?? []),
        blockers: JSON.stringify(body.blockers ?? []),
        evidenceLinks: JSON.stringify(body.evidenceLinks ?? []),
        hasActiveBlocker: body.hasActiveBlocker ?? false,
      },
      update: {
        progressScore: body.progressScore,
        coverageScore: body.coverageScore,
        confidenceScore: body.confidenceScore,
        operationalScore: body.operationalScore,
        qualityScore: body.qualityScore,
        totalScore,
        ragStatus,
        narrative: body.narrative,
        risks: JSON.stringify(body.risks ?? []),
        blockers: JSON.stringify(body.blockers ?? []),
        evidenceLinks: JSON.stringify(body.evidenceLinks ?? []),
        hasActiveBlocker: body.hasActiveBlocker ?? false,
        status: 'SUBMITTED',
        userId: session.id,
      },
      include: { tower: true },
    })

    // Upsert health history
    await prisma.healthScoreHistory.upsert({
      where: { towerId_weekEnding_org: { towerId: body.towerId, weekEnding, org: session.org } },
      create: {
        towerId: body.towerId,
        org: session.org,
        weekEnding,
        totalScore,
        ragStatus,
        progressScore: body.progressScore,
        coverageScore: body.coverageScore,
        confidenceScore: body.confidenceScore,
        operationalScore: body.operationalScore,
        qualityScore: body.qualityScore,
      },
      update: {
        totalScore,
        ragStatus,
        progressScore: body.progressScore,
        coverageScore: body.coverageScore,
        confidenceScore: body.confidenceScore,
        operationalScore: body.operationalScore,
        qualityScore: body.qualityScore,
      },
    })

    // Generate AI summary (non-blocking)
    try {
      const ai = getAIProvider()
      const aiSummary = await ai.generateSummary({
        org: session.org as 'TWG' | 'TCS',
        weekEnding: weekEnding.toISOString(),
        progressScore: body.progressScore,
        coverageScore: body.coverageScore,
        confidenceScore: body.confidenceScore,
        operationalScore: body.operationalScore,
        qualityScore: body.qualityScore,
        totalScore,
        ragStatus,
        narrative: body.narrative,
        risks: body.risks ?? [],
        blockers: body.blockers ?? [],
      }, submission.tower.name)

      await prisma.weeklySubmission.update({
        where: { id: submission.id },
        data: { aiSummary },
      })
    } catch (aiErr) {
      console.error('AI summary failed:', aiErr)
    }

    await writeAudit({
      userId: session.id,
      action: 'CREATE',
      resource: 'submission',
      resourceId: submission.id,
      details: { towerId: body.towerId, org: session.org, totalScore },
    })

    const result = await prisma.weeklySubmission.findUnique({ where: { id: submission.id } })
    return NextResponse.json({
      data: {
        ...result,
        weekEnding: result!.weekEnding.toISOString(),
        createdAt: result!.createdAt.toISOString(),
        updatedAt: result!.updatedAt.toISOString(),
        risks: safeParseJSON<string[]>(result!.risks, []),
        blockers: safeParseJSON<string[]>(result!.blockers, []),
        evidenceLinks: safeParseJSON<string[]>(result!.evidenceLinks, []),
      }
    }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create submission' } }, { status: 500 })
  }
}
