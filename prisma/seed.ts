import { PrismaClient } from '@prisma/client'
import { calculateScore } from '../src/lib/scoring'
import { normaliseWeekEnding } from '../src/lib/utils'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding KT Portal...')

  // Clear existing data
  await prisma.auditLog.deleteMany()
  await prisma.healthScoreHistory.deleteMany()
  await prisma.pulseResponse.deleteMany()
  await prisma.weeklySubmission.deleteMany()
  await prisma.action.deleteMany()
  await prisma.artefact.deleteMany()
  await prisma.decision.deleteMany()
  await prisma.track.deleteMany()
  await prisma.user.deleteMany()
  await prisma.scoringWeights.deleteMany()
  await prisma.tower.deleteMany()

  // Create Scoring Weights
  const weights = await prisma.scoringWeights.create({
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
    },
  })
  console.log('✓ Weights created')

  // ─── TOWERS ───────────────────────────────────────────────────────────────
  const towerA = await prisma.tower.create({
    data: {
      id: 'tower-claims',
      name: 'Claims Processing',
      description: 'End-to-end claims handling, adjudication, and payment processing',
    },
  })

  const towerB = await prisma.tower.create({
    data: {
      id: 'tower-policy',
      name: 'Policy Management',
      description: 'Policy lifecycle management, renewals, and endorsements',
    },
  })

  const towerC = await prisma.tower.create({
    data: {
      id: 'tower-data',
      name: 'Data & Reporting',
      description: 'Data warehousing, analytics, and regulatory reporting',
    },
  })
  console.log('✓ Towers created')

  // ─── TRACKS ───────────────────────────────────────────────────────────────
  const tracksA = await Promise.all([
    prisma.track.create({ data: { towerId: towerA.id, name: 'Claims Intake', description: 'FNOL and claim registration' } }),
    prisma.track.create({ data: { towerId: towerA.id, name: 'Adjudication', description: 'Claim assessment and decision' } }),
    prisma.track.create({ data: { towerId: towerA.id, name: 'Payment Processing', description: 'Settlement and payment execution' } }),
  ])

  const tracksB = await Promise.all([
    prisma.track.create({ data: { towerId: towerB.id, name: 'Policy Issuance', description: 'New policy creation' } }),
    prisma.track.create({ data: { towerId: towerB.id, name: 'Renewals', description: 'Policy renewal processing' } }),
    prisma.track.create({ data: { towerId: towerB.id, name: 'Endorsements', description: 'Mid-term policy changes' } }),
  ])

  const tracksC = await Promise.all([
    prisma.track.create({ data: { towerId: towerC.id, name: 'Data Warehouse', description: 'Core DW and ETL pipelines' } }),
    prisma.track.create({ data: { towerId: towerC.id, name: 'Analytics', description: 'BI and dashboards' } }),
    prisma.track.create({ data: { towerId: towerC.id, name: 'Regulatory Reporting', description: 'Solvency II and other regulatory reports' } }),
  ])
  console.log('✓ Tracks created')

  // ─── USERS ────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: { id: 'user-admin', email: 'admin@kt-portal.local', name: 'Portal Admin', role: 'ADMIN', org: 'ADMIN' },
  })

  const exec = await prisma.user.create({
    data: { id: 'user-exec', email: 'exec@kt-portal.local', name: 'Sarah Chen (Exec)', role: 'EXEC', org: 'TWG' },
  })

  // Tower A users
  const twgLeadA = await prisma.user.create({
    data: { id: 'user-twg-a', email: 'twg.lead.claims@kt-portal.local', name: 'James Wilson (TWG)', role: 'TWG_LEAD', org: 'TWG', towerId: towerA.id },
  })
  const tcsLeadA = await prisma.user.create({
    data: { id: 'user-tcs-a', email: 'tcs.lead.claims@kt-portal.local', name: 'Priya Sharma (TCS)', role: 'TCS_LEAD', org: 'TCS', towerId: towerA.id },
  })

  // Tower B users
  const twgLeadB = await prisma.user.create({
    data: { id: 'user-twg-b', email: 'twg.lead.policy@kt-portal.local', name: 'David Park (TWG)', role: 'TWG_LEAD', org: 'TWG', towerId: towerB.id },
  })
  const tcsLeadB = await prisma.user.create({
    data: { id: 'user-tcs-b', email: 'tcs.lead.policy@kt-portal.local', name: 'Ananya Patel (TCS)', role: 'TCS_LEAD', org: 'TCS', towerId: towerB.id },
  })

  // Tower C users
  const twgLeadC = await prisma.user.create({
    data: { id: 'user-twg-c', email: 'twg.lead.data@kt-portal.local', name: 'Emma Roberts (TWG)', role: 'TWG_LEAD', org: 'TWG', towerId: towerC.id },
  })
  const tcsLeadC = await prisma.user.create({
    data: { id: 'user-tcs-c', email: 'tcs.lead.data@kt-portal.local', name: 'Raj Kumar (TCS)', role: 'TCS_LEAD', org: 'TCS', towerId: towerC.id },
  })

  // Additional track owners
  await prisma.user.create({
    data: { id: 'user-twg-owner-a', email: 'twg.owner.claims@kt-portal.local', name: 'Tom Bradley (TWG)', role: 'TWG_OWNER', org: 'TWG', towerId: towerA.id },
  })
  await prisma.user.create({
    data: { id: 'user-tcs-owner-a', email: 'tcs.owner.claims@kt-portal.local', name: 'Deepa Nair (TCS)', role: 'TCS_OWNER', org: 'TCS', towerId: towerA.id },
  })
  await prisma.user.create({
    data: { id: 'user-tcs-owner-b', email: 'tcs.owner.policy@kt-portal.local', name: 'Vikram Singh (TCS)', role: 'TCS_OWNER', org: 'TCS', towerId: towerB.id },
  })
  await prisma.user.create({
    data: { id: 'user-twg-owner-c', email: 'twg.owner.data@kt-portal.local', name: 'Claire Hudson (TWG)', role: 'TWG_OWNER', org: 'TWG', towerId: towerC.id },
  })
  console.log('✓ Users created')

  // ─── SCORING WEIGHTS (for calculations) ──────────────────────────────────
  const w = {
    progressWeight: weights.progressWeight,
    coverageWeight: weights.coverageWeight,
    confidenceWeight: weights.confidenceWeight,
    operationalWeight: weights.operationalWeight,
    qualityWeight: weights.qualityWeight,
    greenThreshold: weights.greenThreshold,
    amberThreshold: weights.amberThreshold,
    varianceThreshold: weights.varianceThreshold,
  }

  // ─── HELPER ───────────────────────────────────────────────────────────────
  function getWeekEnding(weeksAgo: number): Date {
    const d = new Date()
    d.setDate(d.getDate() - weeksAgo * 7)
    return normaliseWeekEnding(d)
  }

  async function createSubmission(params: {
    towerId: string
    userId: string
    org: 'TWG' | 'TCS'
    weeksAgo: number
    progressScore: number
    coverageScore: number
    confidenceScore: number
    operationalScore: number
    qualityScore: number
    hasActiveBlocker?: boolean
    narrative?: string
    risks?: string[]
    blockers?: string[]
  }) {
    const weekEnding = getWeekEnding(params.weeksAgo)
    const { totalScore, ragStatus } = calculateScore({
      progressScore: params.progressScore,
      coverageScore: params.coverageScore,
      confidenceScore: params.confidenceScore,
      operationalScore: params.operationalScore,
      qualityScore: params.qualityScore,
      hasActiveBlocker: params.hasActiveBlocker ?? false,
    }, w)

    const sub = await prisma.weeklySubmission.upsert({
      where: { towerId_weekEnding_org: { towerId: params.towerId, weekEnding, org: params.org } },
      create: {
        towerId: params.towerId,
        userId: params.userId,
        org: params.org,
        weekEnding,
        status: 'SUBMITTED',
        progressScore: params.progressScore,
        coverageScore: params.coverageScore,
        confidenceScore: params.confidenceScore,
        operationalScore: params.operationalScore,
        qualityScore: params.qualityScore,
        totalScore,
        ragStatus,
        narrative: params.narrative,
        risks: JSON.stringify(params.risks ?? []),
        blockers: JSON.stringify(params.blockers ?? []),
        hasActiveBlocker: params.hasActiveBlocker ?? false,
        aiSummary: `[Seed] KT status for ${params.org}: Overall health ${ragStatus} (${totalScore}/100). ${params.narrative?.slice(0, 100) ?? ''}`,
        aiSummaryApproved: params.weeksAgo > 2,
      },
      update: {
        totalScore,
        ragStatus,
      },
    })

    await prisma.healthScoreHistory.upsert({
      where: { towerId_weekEnding_org: { towerId: params.towerId, weekEnding, org: params.org } },
      create: {
        towerId: params.towerId,
        org: params.org,
        weekEnding,
        totalScore,
        ragStatus,
        progressScore: params.progressScore,
        coverageScore: params.coverageScore,
        confidenceScore: params.confidenceScore,
        operationalScore: params.operationalScore,
        qualityScore: params.qualityScore,
      },
      update: { totalScore, ragStatus },
    })

    return sub
  }

  // Capture weeksAgo locally
  const weeksAgo = (n: number) => n

  // ─── TOWER A — Claims Processing ──────────────────────────────────────────
  // Story: Started amber, improved to green. Low variance.
  const towerAScores = [
    { w: 7, prog: 55, cov: 60, conf: 50, oper: 60, qual: 55 }, // Week 8 ago — amber start
    { w: 6, prog: 60, cov: 65, conf: 55, oper: 65, qual: 60 },
    { w: 5, prog: 65, cov: 68, conf: 62, oper: 68, qual: 64 },
    { w: 4, prog: 70, cov: 72, conf: 68, oper: 70, qual: 68 },
    { w: 3, prog: 75, cov: 78, conf: 72, oper: 75, qual: 72 },
    { w: 2, prog: 80, cov: 82, conf: 76, oper: 78, qual: 76 },
    { w: 1, prog: 85, cov: 85, conf: 80, oper: 82, qual: 80 },
    { w: 0, prog: 88, cov: 87, conf: 83, oper: 85, qual: 82 }, // Latest — green
  ]

  for (const s of towerAScores) {
    // TWG slightly optimistic
    await createSubmission({
      towerId: towerA.id,
      userId: twgLeadA.id,
      org: 'TWG',
      weeksAgo: s.w,
      progressScore: Math.min(100, s.prog + 3),
      coverageScore: Math.min(100, s.cov + 2),
      confidenceScore: Math.min(100, s.conf + 3),
      operationalScore: Math.min(100, s.oper + 2),
      qualityScore: Math.min(100, s.qual + 2),
      narrative: s.w === 0
        ? 'KT progressing well. All 3 tracks have trained TCS counterparts. Adjudication process fully documented.'
        : `Week ${8 - s.w}: Steady progress on KT activities. Documentation and shadowing on schedule.`,
      risks: s.w > 2 ? ['Resource availability during peak claims season'] : [],
    })

    // TCS slightly conservative — variance stays low (<10)
    await createSubmission({
      towerId: towerA.id,
      userId: tcsLeadA.id,
      org: 'TCS',
      weeksAgo: s.w,
      progressScore: s.prog,
      coverageScore: s.cov,
      confidenceScore: s.conf,
      operationalScore: s.oper,
      qualityScore: s.qual,
      narrative: s.w === 0
        ? 'Confident in KT completion. Team has successfully run parallel processing for 2 weeks.'
        : `Week ${8 - s.w}: TCS team building confidence in claims processes.`,
    })
  }
  console.log('✓ Tower A (Claims) submissions created')

  // ─── TOWER B — Policy Management ─────────────────────────────────────────
  // Story: Persistent red. High TWG/TCS variance (>20pts). Active blocker.
  const towerBNarративeTWG = [
    'Week 1: KT planning underway, access issues being raised.',
    'Partial access granted but system integration tests still failing.',
    'Legacy system migration delays impacting KT timeline significantly.',
    'Blocker: Legacy system access not provisioned for TCS team.',
    'No resolution on legacy access. Escalated to infrastructure team.',
    'Infrastructure team unable to resolve without data migration approval.',
    'Exec decision needed: Proceed with parallel environment or delay KT?',
    'KT on hold pending legacy system access resolution.',
  ]

  const towerBNarrativeTCS = [
    'Cannot progress without system access. Team idle.',
    'Partial workaround attempted — insufficient for full KT.',
    'TCS team blocked. Legacy renewal system inaccessible.',
    'Documenting processes from TWG shadow sessions only — no hands-on.',
    'Risk: TCS team knowledge transfer heavily dependent on TWG-led sessions.',
    'Growing concern about readiness. 3 of 6 tracks have no TCS access.',
    'Formal risk raised to PMO. TCS cannot sign off on KT without access.',
    'Emergency escalation submitted. TCS readiness at serious risk.',
  ]

  for (let i = 0; i < 8; i++) {
    const weeksAgoVal = 7 - i
    // TWG is more optimistic (60-70 range)
    await createSubmission({
      towerId: towerB.id,
      userId: twgLeadB.id,
      org: 'TWG',
      weeksAgo: weeksAgoVal,
      progressScore: 55 + i,
      coverageScore: 50 + i,
      confidenceScore: 45 + i,
      operationalScore: 50 + i,
      qualityScore: 48 + i,
      hasActiveBlocker: true,
      narrative: towerBNarративeTWG[i],
      risks: ['Legacy system access not granted', 'Timeline slip risk'],
      blockers: ['Legacy system access not provisioned for TCS team'],
    })

    // TCS is significantly more pessimistic (30-40 range) → variance >20
    await createSubmission({
      towerId: towerB.id,
      userId: tcsLeadB.id,
      org: 'TCS',
      weeksAgo: weeksAgoVal,
      progressScore: 30 + i,
      coverageScore: 28 + i,
      confidenceScore: 25 + i,
      operationalScore: 30 + i,
      qualityScore: 28 + i,
      hasActiveBlocker: true,
      narrative: towerBNarrativeTCS[i],
      risks: ['TCS team cannot independently operate legacy system', 'Knowledge transfer quality severely compromised'],
      blockers: ['No hands-on system access for TCS team', 'Legacy system migration prerequisite not met'],
    })
  }
  console.log('✓ Tower B (Policy) submissions created')

  // ─── TOWER C — Data & Reporting ───────────────────────────────────────────
  // Story: Started green, degraded to amber by week 8 due to key person risk.
  const towerCScores = [
    { w: 7, prog: 85, cov: 82, conf: 80, oper: 84, qual: 83 }, // Green start
    { w: 6, prog: 84, cov: 80, conf: 79, oper: 82, qual: 81 },
    { w: 5, prog: 82, cov: 78, conf: 76, oper: 80, qual: 79 },
    { w: 4, prog: 78, cov: 75, conf: 72, oper: 77, qual: 76 }, // Starting to slip
    { w: 3, prog: 74, cov: 70, conf: 68, oper: 72, qual: 70 }, // Amber territory
    { w: 2, prog: 70, cov: 65, conf: 63, oper: 68, qual: 66 },
    { w: 1, prog: 66, cov: 60, conf: 58, oper: 64, qual: 62 },
    { w: 0, prog: 62, cov: 55, conf: 54, oper: 60, qual: 58 }, // Amber — degraded
  ]

  const towerCNarratives = [
    'KT progressing strongly. Data warehouse architecture fully documented.',
    'All 3 tracks ahead of schedule. ETL pipelines documented and tested.',
    'Senior data architect (Tom Bradley) going on extended leave in 4 weeks.',
    'Key person risk materialising. Tom Bradley knowledge transfer being accelerated.',
    'TCS team struggling with complex ETL pipeline logic. Additional sessions arranged.',
    'Knowledge gaps identified in regulatory reporting module. Remediation plan drafted.',
    'Tom Bradley on leave. Backup documentation sufficient for 60% of processes.',
    'Key person risk impacting confidence. Additional TWG resource requested to backfill.',
  ]

  for (const s of towerCScores) {
    await createSubmission({
      towerId: towerC.id,
      userId: twgLeadC.id,
      org: 'TWG',
      weeksAgo: s.w,
      progressScore: s.prog,
      coverageScore: s.cov,
      confidenceScore: s.conf,
      operationalScore: s.oper,
      qualityScore: s.qual,
      narrative: towerCNarratives[7 - s.w],
      risks: s.w <= 4 ? ['Key person dependency — Tom Bradley sole knowledge holder for DW architecture'] : [],
    })

    // TCS slightly more pessimistic after week 4
    const pessimism = s.w <= 4 ? 5 : 2
    await createSubmission({
      towerId: towerC.id,
      userId: tcsLeadC.id,
      org: 'TCS',
      weeksAgo: s.w,
      progressScore: Math.max(0, s.prog - pessimism),
      coverageScore: Math.max(0, s.cov - pessimism),
      confidenceScore: Math.max(0, s.conf - pessimism - 3),
      operationalScore: Math.max(0, s.oper - pessimism),
      qualityScore: Math.max(0, s.qual - pessimism),
      narrative: s.w <= 4
        ? 'TCS team concern about key person risk. Regulatory reporting module knowledge gaps need urgent attention.'
        : 'TCS team building confidence in all data tracks.',
      risks: s.w <= 4 ? ['Key person risk (Tom Bradley)', 'Regulatory reporting knowledge gaps'] : [],
    })
  }
  console.log('✓ Tower C (Data) submissions created')

  // ─── ACTIONS ──────────────────────────────────────────────────────────────
  const actions = [
    // Tower B — overdue
    {
      towerId: towerB.id,
      ownerId: tcsLeadB.id,
      title: 'Provision legacy system access for TCS team',
      description: 'Infrastructure team to set up TCS accounts on legacy renewal system with read access',
      status: 'OVERDUE',
      priority: 'CRITICAL',
      dueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    },
    {
      towerId: towerB.id,
      ownerId: twgLeadB.id,
      title: 'Schedule emergency exec review for Policy KT blocker',
      description: 'Arrange exec-level decision session on legacy system access options',
      status: 'OVERDUE',
      priority: 'CRITICAL',
      dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    },
    // Tower B — open
    {
      towerId: towerB.id,
      ownerId: tcsLeadB.id,
      title: 'Document policy issuance process from shadow sessions',
      description: 'TCS team to document what has been learned from TWG shadow sessions',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    // Tower C — key person risk
    {
      towerId: towerC.id,
      ownerId: twgLeadC.id,
      title: 'Complete DW architecture documentation before Tom Bradley leave',
      description: 'Ensure all data warehouse architecture decisions and patterns are documented',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      towerId: towerC.id,
      ownerId: tcsLeadC.id,
      title: 'Identify backup TWG resource for regulatory reporting',
      description: 'Request additional TWG SME to cover Tom Bradley\'s leave period',
      status: 'OPEN',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    // Tower A — done
    {
      towerId: towerA.id,
      ownerId: tcsLeadA.id,
      title: 'Complete claims adjudication parallel run',
      description: 'TCS team to run 50 claims in parallel with TWG for sign-off',
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      towerId: towerA.id,
      ownerId: twgLeadA.id,
      title: 'Upload payment processing runbook to artefact store',
      description: 'Final version of payment processing runbook to be uploaded',
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    // Tower C — open
    {
      towerId: towerC.id,
      ownerId: twgLeadC.id,
      title: 'Schedule additional ETL pipeline walkthrough sessions',
      description: 'TCS team needs 3 more hands-on sessions on complex ETL transformations',
      status: 'OPEN',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  ]

  for (const action of actions) {
    await prisma.action.create({ data: action })
  }
  console.log('✓ Actions created')

  // ─── ARTEFACTS ────────────────────────────────────────────────────────────
  const artefactDefs = [
    // Tower A — mostly complete
    { towerId: towerA.id, name: 'Claims Processing Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: towerA.id, name: 'Claims Intake Runbook', type: 'RUNBOOK', uploaded: true },
    { towerId: towerA.id, name: 'Adjudication Process Guide', type: 'RUNBOOK', uploaded: true },
    { towerId: towerA.id, name: 'Payment Processing Runbook', type: 'RUNBOOK', uploaded: true },
    { towerId: towerA.id, name: 'KT Training Plan', type: 'TRAINING', uploaded: true },
    { towerId: towerA.id, name: 'Test Validation Plan', type: 'TEST_PLAN', uploaded: true },
    { towerId: towerA.id, name: 'Handover Checklist', type: 'HANDOVER', uploaded: false }, // 1 missing

    // Tower B — very incomplete (blocked)
    { towerId: towerB.id, name: 'Policy System Architecture', type: 'ARCHITECTURE', uploaded: false },
    { towerId: towerB.id, name: 'Policy Issuance Runbook', type: 'RUNBOOK', uploaded: false },
    { towerId: towerB.id, name: 'Renewals Process Guide', type: 'RUNBOOK', uploaded: false },
    { towerId: towerB.id, name: 'Endorsements Runbook', type: 'RUNBOOK', uploaded: false },
    { towerId: towerB.id, name: 'Legacy System Integration Guide', type: 'OTHER', uploaded: false },
    { towerId: towerB.id, name: 'KT Training Materials', type: 'TRAINING', uploaded: false },

    // Tower C — partially complete
    { towerId: towerC.id, name: 'Data Warehouse Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: towerC.id, name: 'ETL Pipeline Documentation', type: 'RUNBOOK', uploaded: true },
    { towerId: towerC.id, name: 'Analytics Dashboard Guide', type: 'RUNBOOK', uploaded: true },
    { towerId: towerC.id, name: 'Regulatory Reporting Runbook', type: 'RUNBOOK', uploaded: false }, // Key gap
    { towerId: towerC.id, name: 'Data Quality Framework', type: 'OTHER', uploaded: true },
    { towerId: towerC.id, name: 'Handover Checklist', type: 'HANDOVER', uploaded: false },
  ]

  for (const a of artefactDefs) {
    await prisma.artefact.create({
      data: {
        ...a,
        uploadedAt: a.uploaded ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
      },
    })
  }
  console.log('✓ Artefacts created')

  // ─── DECISIONS ────────────────────────────────────────────────────────────
  await prisma.decision.createMany({
    data: [
      {
        towerId: towerB.id,
        title: 'Approve parallel legacy system environment for TCS',
        description: 'Decision required: Should we provision a separate legacy system environment for TCS KT, or proceed with a full data migration first?',
        status: 'PENDING',
      },
      {
        towerId: towerB.id,
        title: 'Extend Policy KT timeline by 6 weeks',
        description: 'Given the legacy system access blocker, should the KT timeline for Policy Management be extended by 6 weeks?',
        status: 'PENDING',
      },
      {
        towerId: towerC.id,
        title: 'Backfill request for Tom Bradley cover',
        description: 'Approve budget for additional TWG resource to cover Tom Bradley\'s extended leave period during KT',
        status: 'PENDING',
      },
    ],
  })
  console.log('✓ Decisions created')

  // ─── AUDIT LOG ENTRIES ────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CREATE',
      resource: 'tower',
      resourceId: towerA.id,
      details: JSON.stringify({ name: towerA.name }),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
  })
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CREATE',
      resource: 'tower',
      resourceId: towerB.id,
      details: JSON.stringify({ name: towerB.name }),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
  })
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CREATE',
      resource: 'tower',
      resourceId: towerC.id,
      details: JSON.stringify({ name: towerC.name }),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('✓ Audit entries created')

  console.log('\n✅ Seed complete!')
  console.log(`   Towers: 3 (Claims, Policy, Data)`)
  console.log(`   Users: 12`)
  console.log(`   Submissions: ${8 * 2 * 3} (8 weeks × 2 orgs × 3 towers)`)
  console.log(`   Actions: ${actions.length}`)
  console.log(`   Artefacts: ${artefactDefs.length}`)
  console.log(`   Decisions: 3`)
}

main()
  .catch(e => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
