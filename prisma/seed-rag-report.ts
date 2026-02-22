/**
 * RAG Report Seed — Towers & status from TOWER RAG STATUS slides (20 Feb 2026)
 * Run: npx tsx prisma/seed-rag-report.ts
 */
import { PrismaClient } from '@prisma/client'
import { calculateScore } from '../src/lib/scoring'
import { normaliseWeekEnding } from '../src/lib/utils'

const prisma = new PrismaClient()

const WEEK_ENDING = normaliseWeekEnding(new Date('2026-02-21'))
const W = {
  progressWeight: 0.25,
  coverageWeight: 0.25,
  confidenceWeight: 0.20,
  operationalWeight: 0.15,
  qualityWeight: 0.15,
  greenThreshold: 75,
  amberThreshold: 50,
  varianceThreshold: 20,
}

// RAG: RED ~40, AMBER ~60, GREEN ~80
const SCORES = { RED: 40, AMBER: 60, GREEN: 80 } as const

const RAG_TOWERS: Array<{
  id: string
  name: string
  group: string
  description?: string
  rag: 'RED' | 'AMBER' | 'GREEN'
  phase: string
  statusSummary: string
  keyRisksMitigations: string
}> = [
  // Group 1
  { id: 'tower-finance', name: 'Finance', group: 'Group 1', rag: 'RED', phase: 'Volume Ramp Up', statusSummary: 'On Track: Strong progress on SOP creation, offshore teams demonstrating ability, meeting/exceeding ramp-up volume targets, technology constraints easing, high engagement from TWG SMEs. Challenges: Capability gaps in judgement-based finance roles (GA Group/Fixed Assets, FBP-TWS), limited independence despite SOPs, inconsistent delivery discipline, AP and FBP capacity timing misaligned with onshore exits.', keyRisksMitigations: 'TCS Resourcing: Actions underway in pressured areas, additional resources onboarded in AP, leadership oversight to stabilize by month-end. Delivery Discipline: Breakout functional area daily standups. Capability gaps: Stabilize critical roles, track with daily evidence of independent task completion.' },
  { id: 'tower-wms', name: 'WMS', group: 'Group 1', rag: 'GREEN', phase: 'KT', statusSummary: 'On Track: KT Topics and Timeline. Challenges: WMS Application Related Access impacting KT.', keyRisksMitigations: 'IT Access Resolved 20/02 KT recoverable. No impact to timeline.' },
  { id: 'tower-devops', name: 'Dev Ops', group: 'Group 1', rag: 'RED', phase: 'KT', statusSummary: 'Dev Ops — KT Paused/Delayed due to insufficient experience from TCS resources.', keyRisksMitigations: 'Key Risk: TCS Resources do not have the pre-requisite experience. Mitigation: New DevOps resources onboarded by TCS & Approved by Matt Law. KT to re-commence 24/02.' },
  { id: 'tower-integration', name: 'Integration', group: 'Group 1', rag: 'GREEN', phase: 'KT', statusSummary: 'On Track: KT on track — Resourcing assessment completing W/C 23/02. Challenge: QA Resourcing.', keyRisksMitigations: 'Key Risk: TCS QA Resource yet to be finalised. Will soon start to impact KT. Mitigation: Resolution in flight with TCS. ETA pending.' },
  { id: 'tower-webapp', name: 'Web/App', group: 'Group 1', rag: 'AMBER', phase: 'KT', statusSummary: 'App KT is on track — QA Resource Pending for app; Web — TCS Technical Lead Pending — KT Blocked.', keyRisksMitigations: 'Timeline not at risk.' },
  { id: 'tower-data', name: 'Data', group: 'Group 1', rag: 'GREEN', phase: 'KT', statusSummary: 'On track: KT Underway.', keyRisksMitigations: '' },
  { id: 'tower-cyber', name: 'Cyber Security', group: 'Group 1', rag: 'GREEN', phase: 'KT', statusSummary: 'On track: KT Underway.', keyRisksMitigations: '' },
  { id: 'tower-cloud', name: 'Cloud', group: 'Group 1', rag: 'GREEN', phase: 'KT', statusSummary: 'On track: KT Underway.', keyRisksMitigations: '' },
  { id: 'tower-servicemgmt', name: 'Service Management', group: 'Group 1', rag: 'GREEN', phase: 'KT', statusSummary: 'On track: KT Underway.', keyRisksMitigations: '' },
  // Group 2
  { id: 'tower-merch', name: 'Merch', group: 'Group 2', rag: 'RED', phase: 'KT', statusSummary: 'On track: KT Sessions, Timeline, SOP and Assessment. Challenge: IT Access, TCS team unable to hand on practice, potential timeline impact.', keyRisksMitigations: 'Key Risk: Delay in Merch system UAT access has impacted hands-on transition KT activities. Mitigation: Access issues resolved 20/02 with exception of QTUI. Working group convened and issue resolved.' },
  { id: 'tower-omni', name: 'Omni', group: 'Group 2', rag: 'AMBER', phase: 'KT', statusSummary: 'On track: KT Sessions, Timeline and Access requests. Challenge: Delay in SOP and Assessment, Key TCS SME availability.', keyRisksMitigations: 'Key Risk: Delayed priority SME onboarding, decision pending around onshore/offshore placement. Mitigation: In progress with TCS.' },
  { id: 'tower-payroll', name: 'Payroll and TA', group: 'Group 2', rag: 'AMBER', phase: 'KT', statusSummary: 'On track: KT Sessions, Timeline, Resourcing, Access requests. Challenges: Week 5/6 KT planning delayed, SME availability/capacity/SME Annual Leave/tight timeline.', keyRisksMitigations: 'Key Risk: Capability & Compliance. Mitigation: Robust skills and competency assessment criteria. Clear demonstration of KT comprehension.' },
  { id: 'tower-supplychain', name: 'Supply Chain', group: 'Group 2', rag: 'GREEN', phase: 'KT', statusSummary: 'On track: KT Sessions, Timeline, Resourcing.', keyRisksMitigations: 'No Risk at this stage.' },
  // Group 3
  { id: 'tower-customerservice', name: 'Customer Service', group: 'Group 3', rag: 'GREEN', phase: 'KT', statusSummary: 'NLG: On-track. SOP quality good. Admin Support: On-track. SOP quality good. TWL/WSL: On-track. SOP quality needs improvement. Flagged concern over experience of KT lead.', keyRisksMitigations: 'Key Risk: KT lead for TWL/WSL is having difficulty absorbing/understanding content. Mitigation: Additional coaching and resources provided.' },
  { id: 'tower-services', name: 'Services', group: 'Group 3', rag: 'AMBER', phase: 'KT', statusSummary: 'Bookings: On-track. SOP quality good. Insurance: On hold pending partner sign off to proceed.', keyRisksMitigations: '' },
]

async function main() {
  console.log('🌱 Seeding RAG Report (20 Feb 2026)...')

  // Get or create weights
  let weights = await prisma.scoringWeights.findFirst()
  if (!weights) {
    weights = await prisma.scoringWeights.create({
      data: { id: 'default', progressWeight: 0.25, coverageWeight: 0.25, confidenceWeight: 0.20, operationalWeight: 0.15, qualityWeight: 0.15, greenThreshold: 75, amberThreshold: 50, varianceThreshold: 20 },
    })
  }

  // Get or create report users
  let twgUser = await prisma.user.findFirst({ where: { org: 'TWG' } })
  let tcsUser = await prisma.user.findFirst({ where: { org: 'TCS' } })
  if (!twgUser) {
    twgUser = await prisma.user.create({ data: { email: 'twg.report@kt-portal.local', name: 'TWG Report', role: 'TWG_LEAD', org: 'TWG' } })
  }
  if (!tcsUser) {
    tcsUser = await prisma.user.create({ data: { email: 'tcs.report@kt-portal.local', name: 'TCS Report', role: 'TCS_LEAD', org: 'TCS' } })
  }

  let created = 0
  for (const t of RAG_TOWERS) {
    const tower = await prisma.tower.upsert({
      where: { id: t.id },
      create: { id: t.id, name: t.name, description: `${t.group} — ${t.phase}` },
      update: { name: t.name, description: `${t.group} — ${t.phase}` },
    })
    created += 1

    const baseScore = SCORES[t.rag]
    const narrative = `Phase: ${t.phase}\n\n${t.statusSummary}`
    const risks = t.keyRisksMitigations ? [t.keyRisksMitigations] : []
    const { totalScore, ragStatus } = calculateScore(
      { progressScore: baseScore, coverageScore: baseScore, confidenceScore: baseScore, operationalScore: baseScore, qualityScore: baseScore, hasActiveBlocker: false },
      W
    )

    // TWG submission
    await prisma.weeklySubmission.upsert({
      where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding: WEEK_ENDING, org: 'TWG' } },
      create: {
        towerId: tower.id,
        userId: twgUser.id,
        org: 'TWG',
        weekEnding: WEEK_ENDING,
        status: 'SUBMITTED',
        progressScore: baseScore,
        coverageScore: baseScore,
        confidenceScore: baseScore,
        operationalScore: baseScore,
        qualityScore: baseScore,
        totalScore,
        ragStatus,
        narrative,
        risks: JSON.stringify(risks),
        blockers: '[]',
        hasActiveBlocker: false,
      },
      update: { narrative, risks: JSON.stringify(risks), totalScore, ragStatus },
    })

    // TCS submission (slight variance for realism)
    const tcsScore = Math.min(100, Math.max(0, baseScore + (t.rag === 'RED' ? 5 : -3)))
    const { totalScore: tcsTotal, ragStatus: tcsRag } = calculateScore(
      { progressScore: tcsScore, coverageScore: tcsScore, confidenceScore: tcsScore, operationalScore: tcsScore, qualityScore: tcsScore, hasActiveBlocker: false },
      W
    )
    await prisma.weeklySubmission.upsert({
      where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding: WEEK_ENDING, org: 'TCS' } },
      create: {
        towerId: tower.id,
        userId: tcsUser.id,
        org: 'TCS',
        weekEnding: WEEK_ENDING,
        status: 'SUBMITTED',
        progressScore: tcsScore,
        coverageScore: tcsScore,
        confidenceScore: tcsScore,
        operationalScore: tcsScore,
        qualityScore: tcsScore,
        totalScore: tcsTotal,
        ragStatus: tcsRag,
        narrative,
        risks: JSON.stringify(risks),
        blockers: '[]',
        hasActiveBlocker: false,
      },
      update: { narrative, risks: JSON.stringify(risks), totalScore: tcsTotal, ragStatus: tcsRag },
    })

    // Health score history
    await prisma.healthScoreHistory.upsert({
      where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding: WEEK_ENDING, org: 'TWG' } },
      create: {
        towerId: tower.id,
        org: 'TWG',
        weekEnding: WEEK_ENDING,
        totalScore,
        ragStatus,
        progressScore: baseScore,
        coverageScore: baseScore,
        confidenceScore: baseScore,
        operationalScore: baseScore,
        qualityScore: baseScore,
      },
      update: { totalScore, ragStatus },
    })
    await prisma.healthScoreHistory.upsert({
      where: { towerId_weekEnding_org: { towerId: tower.id, weekEnding: WEEK_ENDING, org: 'TCS' } },
      create: {
        towerId: tower.id,
        org: 'TCS',
        weekEnding: WEEK_ENDING,
        totalScore: tcsTotal,
        ragStatus: tcsRag,
        progressScore: tcsScore,
        coverageScore: tcsScore,
        confidenceScore: tcsScore,
        operationalScore: tcsScore,
        qualityScore: tcsScore,
      },
      update: { totalScore: tcsTotal, ragStatus: tcsRag },
    })
  }

  console.log(`✅ RAG Report seeded! ${RAG_TOWERS.length} towers, week ending ${WEEK_ENDING.toISOString().slice(0, 10)}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
