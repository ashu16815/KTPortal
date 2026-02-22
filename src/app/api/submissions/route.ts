import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, canWriteTower } from '@/lib/auth'
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

    type SubmissionRow = (typeof submissions)[number]
    const mapped = submissions.map((s: SubmissionRow) => ({
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

    // Exec users are read-only
    if (session.role === 'EXEC') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Executive accounts cannot submit' } }, { status: 403 })
    }

    const body = await request.json()

    // Required field validation
    const towerId = (body.towerId ?? '').trim()
    if (!towerId) {
      return NextResponse.json({ error: { code: 'VALIDATION', message: 'towerId is required' } }, { status: 400 })
    }

    const scoreFields = ['progressScore', 'coverageScore', 'confidenceScore', 'operationalScore', 'qualityScore'] as const
    for (const field of scoreFields) {
      const v = Number(body[field])
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        return NextResponse.json({ error: { code: 'VALIDATION', message: `${field} must be 0–100` } }, { status: 400 })
      }
    }

    // Tower ownership: leads can only submit for their own tower
    if (!canWriteTower(session, towerId)) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You can only submit for your assigned tower' } }, { status: 403 })
    }

    // Verify user exists in DB (stub-session users won't have a DB record)
    const dbUser = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true } })
    if (!dbUser) {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in with a real account to submit' } }, { status: 401 })
    }

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
