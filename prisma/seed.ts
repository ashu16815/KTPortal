import { PrismaClient } from '@prisma/client'
import { calculateScore } from '../src/lib/scoring'

const prisma = new PrismaClient()

// Week-ending Fridays — 8 weeks of history ending 20 Feb 2026 (report date)
const W = [
  new Date('2026-01-02T00:00:00.000Z'), // W[0] oldest
  new Date('2026-01-09T00:00:00.000Z'),
  new Date('2026-01-16T00:00:00.000Z'),
  new Date('2026-01-23T00:00:00.000Z'),
  new Date('2026-01-30T00:00:00.000Z'),
  new Date('2026-02-06T00:00:00.000Z'),
  new Date('2026-02-13T00:00:00.000Z'),
  new Date('2026-02-20T00:00:00.000Z'), // W[7] report date (latest)
]

const weights = {
  progressWeight: 0.25,
  coverageWeight: 0.25,
  confidenceWeight: 0.20,
  operationalWeight: 0.15,
  qualityWeight: 0.15,
  greenThreshold: 75,
  amberThreshold: 50,
  varianceThreshold: 20,
}

async function createSub(params: {
  towerId: string; userId: string; org: 'TWG' | 'TCS'; weekEnding: Date
  progressScore: number; coverageScore: number; confidenceScore: number
  operationalScore: number; qualityScore: number
  hasActiveBlocker?: boolean; narrative?: string; risks?: string[]; blockers?: string[]
}) {
  const { totalScore, ragStatus } = calculateScore({
    progressScore: params.progressScore, coverageScore: params.coverageScore,
    confidenceScore: params.confidenceScore, operationalScore: params.operationalScore,
    qualityScore: params.qualityScore, hasActiveBlocker: params.hasActiveBlocker ?? false,
  }, weights)

  await prisma.weeklySubmission.upsert({
    where: { towerId_weekEnding_org: { towerId: params.towerId, weekEnding: params.weekEnding, org: params.org } },
    create: {
      towerId: params.towerId, userId: params.userId, org: params.org, weekEnding: params.weekEnding,
      status: 'SUBMITTED',
      progressScore: params.progressScore, coverageScore: params.coverageScore,
      confidenceScore: params.confidenceScore, operationalScore: params.operationalScore,
      qualityScore: params.qualityScore, totalScore, ragStatus,
      narrative: params.narrative,
      risks: JSON.stringify(params.risks ?? []), blockers: JSON.stringify(params.blockers ?? []),
      hasActiveBlocker: params.hasActiveBlocker ?? false,
      aiSummary: `KT status for ${params.org}: ${ragStatus} (${totalScore}/100). ${params.narrative?.slice(0, 120) ?? ''}`,
      aiSummaryApproved: params.weekEnding < W[6],
    },
    update: { totalScore, ragStatus },
  })

  await prisma.healthScoreHistory.upsert({
    where: { towerId_weekEnding_org: { towerId: params.towerId, weekEnding: params.weekEnding, org: params.org } },
    create: {
      towerId: params.towerId, org: params.org, weekEnding: params.weekEnding,
      totalScore, ragStatus,
      progressScore: params.progressScore, coverageScore: params.coverageScore,
      confidenceScore: params.confidenceScore, operationalScore: params.operationalScore,
      qualityScore: params.qualityScore,
    },
    update: { totalScore, ragStatus },
  })
}

async function main() {
  console.log('🌱 Seeding KT Portal — Project Ora Operating Model (20 Feb 2026)...')

  // ─── CLEAR ────────────────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany()
  await prisma.dailyKTUpdate.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.raiddLog.deleteMany()
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
  await prisma.towerGroup.deleteMany()
  console.log('✓ Cleared')

  // ─── WEIGHTS ──────────────────────────────────────────────────────────────
  await prisma.scoringWeights.create({ data: { id: 'default', ...weights } })

  // ─── GROUPS ───────────────────────────────────────────────────────────────
  const g1 = await prisma.towerGroup.create({
    data: {
      id: 'group-1', groupNumber: 1, name: 'Group 1',
      transitionPartnerTWG: 'Russell Charman',
      transitionManagerTCS: 'Chandra Subramanian / Kapil Deo / Murali Madabhooshi / Sanchit Sharma',
      description: 'Finance, IT/ADM (WMS, Dev Ops, Integration, Web/App, Data, Cyber Security, Cloud, Service Management)',
    },
  })
  const g2 = await prisma.towerGroup.create({
    data: {
      id: 'group-2', groupNumber: 2, name: 'Group 2',
      transitionPartnerTWG: 'Yamuna Kumar',
      transitionManagerTCS: 'Indu Shah / Sanchit Sharma',
      description: 'Merch, Omni, Payroll & TA, Supply Chain',
    },
  })
  const g3 = await prisma.towerGroup.create({
    data: {
      id: 'group-3', groupNumber: 3, name: 'Group 3',
      transitionPartnerTWG: 'Jason Lay Yee',
      transitionManagerTCS: 'Jeanette Pulgo / Chris Templeton',
      description: 'Customer Service, Commercial and Services',
    },
  })
  console.log('✓ 3 Groups')

  // ─── TOWERS ───────────────────────────────────────────────────────────────
  // Group 1
  const tFinance = await prisma.tower.create({ data: { id: 'tower-finance',       name: 'Finance',                  groupId: g1.id, ktPhase: 'VOLUME_RAMP_UP', ktModel: 'TTT', twgLeadName: 'Stefan Knight',          tcsLeadName: 'Siva Changalwala',          description: 'Finance KT — Volume Ramp Up. Covers GA Group, Fixed Assets, FBP-TWS, Accounts Payable.' } })
  const tWMS     = await prisma.tower.create({ data: { id: 'tower-wms',           name: 'WMS',                      groupId: g1.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Matt Law',               tcsLeadName: 'Bigyanranjan Satpathy',     description: 'Warehouse Management System KT. IT Access resolved 20/02.' } })
  const tDevOps  = await prisma.tower.create({ data: { id: 'tower-devops',        name: 'Dev Ops',                  groupId: g1.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Francois Jacobs',        tcsLeadName: 'Krishna Kalluri',           description: 'DevOps KT — paused pending TCS resource onboarding. Re-commencing 24/02.' } })
  const tInteg   = await prisma.tower.create({ data: { id: 'tower-integration',   name: 'Integration',              groupId: g1.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Francois Jacobs',        tcsLeadName: 'Krishna Kalluri',           description: 'Integration KT — on track, QA resourcing completing W/C 23/02.' } })
  const tWebApp  = await prisma.tower.create({ data: { id: 'tower-webapp',        name: 'Salesforce / Web Apps',    groupId: g1.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Francois Jacobs',        tcsLeadName: 'Pradeep Kotegar',           description: 'Salesforce & Web Apps KT — App on track, Web blocked on TCS Technical Lead.' } })
  const tData    = await prisma.tower.create({ data: { id: 'tower-data',          name: 'Data & Analytics',         groupId: g1.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Ankit Gupta',            tcsLeadName: 'Sridhar Rathinasabapathy', description: 'Data & Analytics KT — underway.' } })
  const tCyber   = await prisma.tower.create({ data: { id: 'tower-cybersecurity', name: 'Cyber Security',           groupId: g1.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Glenn Elley',            tcsLeadName: 'Siddha Nadheswaran',        description: 'Cyber Security KT — underway.' } })
  const tCloud   = await prisma.tower.create({ data: { id: 'tower-cloud',         name: 'Infra, Cloud & Network',   groupId: g1.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Paul Tinson',            tcsLeadName: 'Pradeep Jeyaraj',           description: 'Infrastructure, Cloud and Network KT — underway.' } })
  const tSvcMgmt = await prisma.tower.create({ data: { id: 'tower-svcmgmt',       name: 'Service Management',       groupId: g1.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Ann De Silva',           tcsLeadName: 'Elamparithi P',             description: 'Service Management KT — underway.' } })
  // Group 2
  const tMerch   = await prisma.tower.create({ data: { id: 'tower-merch',         name: 'Merch',                    groupId: g2.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Carrie Fairley',         tcsLeadName: 'Harpreet Sawhney',          description: 'Merch KT — IT access issues impacted hands-on practice. QTUI exception remains.' } })
  const tOmni    = await prisma.tower.create({ data: { id: 'tower-omni',          name: 'Omni',                     groupId: g2.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Cameron K',             tcsLeadName: 'Ranganatha Narayana',       description: 'Omni KT — SOP and Assessment delayed, TCS SME availability challenge.' } })
  const tPayroll = await prisma.tower.create({ data: { id: 'tower-payroll',       name: 'Payroll & TA',             groupId: g2.id, ktPhase: 'KT',            ktModel: 'TTC', twgLeadName: 'Kim Nicholas',           tcsLeadName: 'Ayan Mandal',               description: 'Payroll & TA KT — Week 5/6 delayed, SME capacity constraints.' } })
  const tSupply  = await prisma.tower.create({ data: { id: 'tower-supplychain',   name: 'Supply Chain',             groupId: g2.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Vanesse Strydom',        tcsLeadName: 'Ranganatha Narayana',       description: 'Supply Chain KT — on track, no risks at this stage.' } })
  // Group 3
  const tCustSvc = await prisma.tower.create({ data: { id: 'tower-custservice',   name: 'Customer Service',         groupId: g3.id, ktPhase: 'KT',            ktModel: 'TTC', twgLeadName: 'Hayley McNab',           tcsLeadName: 'Yvette Yu',                 description: 'Customer Service KT — NLG/Admin on track, TWL/WSL SOP quality improvement needed.' } })
  const tComSvc  = await prisma.tower.create({ data: { id: 'tower-comsvc',        name: 'Commercial & Services',    groupId: g3.id, ktPhase: 'KT',            ktModel: 'TTT', twgLeadName: 'Kim Nicholas',           tcsLeadName: 'Ranganatha Narayana',       description: 'Commercial & Services KT — Bookings on track, Insurance on hold pending partner sign-off.' } })
  console.log('✓ 15 Towers (3 groups)')

  // ─── KEY PROGRAMME USERS ──────────────────────────────────────────────────
  const admin = await prisma.user.create({ data: { id: 'user-admin', email: 'admin@kt-portal.local', name: 'Portal Admin', role: 'ADMIN', org: 'ADMIN', jobTitle: 'System Administrator' } })
  await prisma.user.create({ data: { id: 'user-ankit', email: 'ankit.gupta@kt-portal.local', name: 'Ankit Gupta', role: 'EXEC', org: 'TWG', jobTitle: 'Project Ora Lead', transitionRole: 'PROJECT_LEAD' } })
  await prisma.user.create({ data: { id: 'user-russell', email: 'russell.charman@kt-portal.local', name: 'Russell Charman', role: 'EXEC', org: 'TWG', jobTitle: 'Transition Partner — Group 1', transitionRole: 'TRANSITION_PARTNER' } })
  await prisma.user.create({ data: { id: 'user-yamuna', email: 'yamuna.kumar@kt-portal.local', name: 'Yamuna Kumar', role: 'EXEC', org: 'TWG', jobTitle: 'Transition Partner — Group 2', transitionRole: 'TRANSITION_PARTNER' } })
  await prisma.user.create({ data: { id: 'user-jason', email: 'jason.layyee@kt-portal.local', name: 'Jason Lay Yee', role: 'EXEC', org: 'TWG', jobTitle: 'Transition Partner — Group 3', transitionRole: 'TRANSITION_PARTNER' } })
  await prisma.user.create({ data: { id: 'user-richard', email: 'richard.parker@kt-portal.local', name: 'Richard Parker', role: 'EXEC', org: 'TWG', jobTitle: 'HR Support Track Lead', transitionRole: 'TRANSITION_PARTNER' } })
  await prisma.user.create({ data: { id: 'user-gaylen', email: 'gaylen.vanheerden@kt-portal.local', name: 'Gaylen van Heerden', role: 'EXEC', org: 'TWG', jobTitle: 'GM Culture & Capability', transitionRole: 'TRANSITION_PARTNER' } })
  // TCS Transition Managers
  await prisma.user.create({ data: { id: 'user-chandra', email: 'chandra.subramanian@kt-portal.local', name: 'Chandra Subramanian', role: 'EXEC', org: 'TCS', jobTitle: 'TCS Transition Manager — Group 1', transitionRole: 'TRANSITION_MANAGER' } })
  await prisma.user.create({ data: { id: 'user-kapil', email: 'kapil.deo@kt-portal.local', name: 'Kapil Deo', role: 'EXEC', org: 'TCS', jobTitle: 'TCS Transition Manager — Group 1', transitionRole: 'TRANSITION_MANAGER' } })
  await prisma.user.create({ data: { id: 'user-sanchit', email: 'sanchit.sharma@kt-portal.local', name: 'Sanchit Sharma', role: 'EXEC', org: 'TCS', jobTitle: 'TCS Transition Manager — Finance / Group 2', transitionRole: 'TRANSITION_MANAGER' } })
  await prisma.user.create({ data: { id: 'user-murali', email: 'murali.madabhooshi@kt-portal.local', name: 'Murali Madabhooshi', role: 'EXEC', org: 'TCS', jobTitle: 'TCS Transition Manager — Cloud / Service Mgmt', transitionRole: 'TRANSITION_MANAGER' } })
  await prisma.user.create({ data: { id: 'user-indu', email: 'indu.shah@kt-portal.local', name: 'Indu Shah', role: 'EXEC', org: 'TCS', jobTitle: 'TCS Transition Manager — Group 2', transitionRole: 'TRANSITION_MANAGER' } })
  await prisma.user.create({ data: { id: 'user-jeanette', email: 'jeanette.pulgo@kt-portal.local', name: 'Jeanette Pulgo', role: 'EXEC', org: 'TCS', jobTitle: 'TCS Transition Manager — Group 3', transitionRole: 'TRANSITION_MANAGER' } })
  await prisma.user.create({ data: { id: 'user-chris', email: 'chris.templeton@kt-portal.local', name: 'Chris Templeton', role: 'EXEC', org: 'TCS', jobTitle: 'TCS Transition Manager — Commercial & Services', transitionRole: 'TRANSITION_MANAGER' } })
  console.log('✓ Programme leadership users')

  // TWG + TCS leads per tower
  const towerUsers: Record<string, { twg: { id: string }, tcs: { id: string } }> = {}

  const towerPeople = [
    { tower: tFinance,  slug: 'finance',  twgName: 'Stefan Knight',               tcsName: 'Siva Changalwala',          twgTitle: 'Finance TWG Tower Lead',              tcsTitle: 'Finance TCS Tower Lead' },
    { tower: tWMS,      slug: 'wms',      twgName: 'Matt Law',                    tcsName: 'Bigyanranjan Satpathy',     twgTitle: 'WMS TWG Tower Lead',                  tcsTitle: 'WMS TCS Tower Lead (Merch Apps / WMS)' },
    { tower: tDevOps,   slug: 'devops',   twgName: 'Francois Jacobs',             tcsName: 'Krishna Kalluri',           twgTitle: 'Dev Ops TWG Tower Lead',              tcsTitle: 'Dev Ops TCS Tower Lead (Integration DevOps)' },
    { tower: tInteg,    slug: 'integ',    twgName: 'Francois Jacobs',             tcsName: 'Krishna Kalluri',           twgTitle: 'Integration TWG Tower Lead',          tcsTitle: 'Integration TCS Tower Lead' },
    { tower: tWebApp,   slug: 'webapp',   twgName: 'Francois Jacobs',             tcsName: 'Pradeep Kotegar',           twgTitle: 'Salesforce/Web Apps TWG Tower Lead',  tcsTitle: 'Salesforce/Web Apps TCS Tower Lead' },
    { tower: tData,     slug: 'data',     twgName: 'Ankit Gupta',                 tcsName: 'Sridhar Rathinasabapathy', twgTitle: 'Data & Analytics TWG Tower Lead',     tcsTitle: 'Data & Analytics TCS Tower Lead' },
    { tower: tCyber,    slug: 'cyber',    twgName: 'Glenn Elley',                 tcsName: 'Siddha Nadheswaran',        twgTitle: 'Cyber Security TWG Tower Lead',       tcsTitle: 'Cyber Security TCS Tower Lead' },
    { tower: tCloud,    slug: 'cloud',    twgName: 'Paul Tinson',                 tcsName: 'Pradeep Jeyaraj',           twgTitle: 'Infra, Cloud & Network TWG Tower Lead', tcsTitle: 'Infra, Cloud & Network TCS Tower Lead' },
    { tower: tSvcMgmt,  slug: 'svcmgmt',  twgName: 'Ann De Silva',                tcsName: 'Elamparithi P',             twgTitle: 'Service Management TWG Tower Lead',   tcsTitle: 'Service Management TCS Tower Lead' },
    { tower: tMerch,    slug: 'merch',    twgName: 'Carrie Fairley',              tcsName: 'Harpreet Sawhney',          twgTitle: 'Merch TWG Tower Lead',                tcsTitle: 'Merch TCS Tower Lead' },
    { tower: tOmni,     slug: 'omni',     twgName: 'Cameron K',                   tcsName: 'Ranganatha Narayana',       twgTitle: 'Omni TWG Tower Lead',                 tcsTitle: 'Omni TCS Tower Lead' },
    { tower: tPayroll,  slug: 'payroll',  twgName: 'Kim Nicholas',                tcsName: 'Ayan Mandal',               twgTitle: 'Payroll & TA TWG Tower Lead',         tcsTitle: 'Payroll & TA TCS Tower Lead' },
    { tower: tSupply,   slug: 'supply',   twgName: 'Vanesse Strydom',             tcsName: 'Ranganatha Narayana',       twgTitle: 'Supply Chain TWG Tower Lead',         tcsTitle: 'Supply Chain TCS Tower Lead' },
    { tower: tCustSvc,  slug: 'custsvc',  twgName: 'Hayley McNab',                tcsName: 'Yvette Yu',                 twgTitle: 'Customer Service TWG Tower Lead',     tcsTitle: 'Customer Service TCS Tower Lead' },
    { tower: tComSvc,   slug: 'comsvc',   twgName: 'Kim Nicholas',                tcsName: 'Ranganatha Narayana',       twgTitle: 'Commercial & Services TWG Tower Lead',tcsTitle: 'Commercial & Services TCS Tower Lead' },
  ]

  for (const p of towerPeople) {
    const twg = await prisma.user.create({ data: { email: `twg.${p.slug}@kt-portal.local`, name: p.twgName, role: 'TWG_LEAD', org: 'TWG', towerId: p.tower.id, jobTitle: p.twgTitle, transitionRole: 'TOWER_LEAD' } })
    const tcs = await prisma.user.create({ data: { email: `tcs.${p.slug}@kt-portal.local`, name: p.tcsName, role: 'TCS_LEAD', org: 'TCS', towerId: p.tower.id, jobTitle: p.tcsTitle, transitionRole: 'TOWER_LEAD' } })
    towerUsers[p.tower.id] = { twg, tcs }
  }
  console.log('✓ 30 Tower lead users')

  // ─── SUBMISSIONS HELPER ───────────────────────────────────────────────────
  const sub = async (tId: string, uId: string, org: 'TWG' | 'TCS', scores: number[], w: number, narr: string, risks: string[] = [], blockers: string[] = [], blocker = false) =>
    createSub({ towerId: tId, userId: uId, org, weekEnding: W[w], progressScore: scores[0], coverageScore: scores[1], confidenceScore: scores[2], operationalScore: scores[3], qualityScore: scores[4], hasActiveBlocker: blocker, narrative: narr, risks, blockers })

  // ─── GROUP 1 SUBMISSIONS ──────────────────────────────────────────────────

  // FINANCE — RED (Volume Ramp Up) W[7] target: prog=50,cov=45,conf=35,oper=45,qual=40 → total≈44 → RED
  const fScores = [[52,49,38,45,42],[53,50,38,45,42],[54,50,37,44,41],[53,49,36,44,41],[52,48,35,43,40],[53,49,36,44,41],[51,47,34,43,40],[50,45,35,45,40]]
  const fNarrTWG = ['Volume Ramp Up commenced. Finance KT initiated across GA Group, Fixed Assets, FBP-TWS and AP.','SOP creation underway. Offshore teams onboarding across all finance tracks.','Several tracks meeting volume targets. Technology constraints easing.','Strong SOP baseline established. High TWG SME engagement.','Offshore teams processing defined transactional work at scale.','AP and FBP capacity timing misaligned with planned onshore exits.','Inconsistent delivery discipline eroding stakeholder confidence.','On Track: Strong SOP progress, offshore processing at scale. Challenges: Capability gaps (GA Group/Fixed Assets/FBP-TWS), limited independence, inconsistent delivery discipline, AP/FBP timing misaligned.']
  const fNarrTCS = ['TCS teams commencing Finance Volume Ramp Up across all tracks.','SOPs being followed. Judgement-based task capability needs development.','Volume targets met for transactional work. Judgement tasks remain challenging.','Capability gaps identified in GA Group and Fixed Assets.','Limited independence despite SOPs and walkthroughs.','FBP-TWS capability gap becoming more apparent.','Additional AP resources being onboarded.','TCS Resourcing actions underway. AP resources onboarded, more joiners planned. Capability gaps in judgement-based roles (GA Group/Fixed Assets/FBP-TWS) remain primary concern. Detailed plan due 23/02 (Siva).']
  for (let i = 0; i < 8; i++) {
    const s = fScores[i]; const risks = ['Capability gaps in judgement-based finance roles (GA Group/Fixed Assets, FBP-TWS)', 'AP and FBP capacity timing misaligned with onshore exits']
    await sub(tFinance.id, towerUsers[tFinance.id].twg.id, 'TWG', s, i, fNarrTWG[i], risks)
    await sub(tFinance.id, towerUsers[tFinance.id].tcs.id, 'TCS', [s[0]-5,s[1]-5,s[2]-5,s[3]-5,s[4]-5], i, fNarrTCS[i], ['TCS capability gaps in judgement-based tasks'])
  }

  // WMS — GREEN (brief AMBER weeks 4-6 due to access issue, resolved 20/02)
  const wmsS = [[79,77,75,78,76],[80,78,76,79,77],[80,79,77,80,78],[80,78,76,79,77],[72,68,65,70,67],[68,65,60,67,63],[70,68,64,69,66],[78,75,72,76,74]]
  const wmsN = ['WMS KT on track.','WMS KT progressing well.','WMS documentation and shadowing on schedule.','WMS KT on track.','WMS Application Related Access impacting KT. IT ticket raised.','WMS Application Related Access still impacting KT. Escalated.','IT resolving WMS access. Workaround in place.','IT Access Resolved 20/02. KT recoverable. No impact to timeline.']
  for (let i = 0; i < 8; i++) {
    const s = wmsS[i]; const hasRisk = i >= 4 && i < 7; const risks = hasRisk ? ['WMS Application Related Access impacting KT'] : []
    await sub(tWMS.id, towerUsers[tWMS.id].twg.id, 'TWG', s, i, wmsN[i], risks)
    await sub(tWMS.id, towerUsers[tWMS.id].tcs.id, 'TCS', [s[0]-2,s[1]-2,s[2]-3,s[3]-2,s[4]-2], i, wmsN[i], risks)
  }

  // DEV OPS — RED (KT paused from week 4, hasActiveBlocker)
  const devS = [[78,76,74,77,75],[79,77,75,78,76],[77,75,73,76,74],[70,65,60,68,63],[40,35,30,38,32],[30,28,22,30,25],[28,25,20,28,22],[30,27,22,30,24]]
  const devN = ['DevOps KT progressing. TCS team onboarding to CI/CD pipelines.','KT on track. TCS gaining familiarity with DevOps toolchain.','Good progress. TCS shadowing deployments.','Concerns emerging about TCS DevOps experience depth.','KT Paused: TCS resources lack pre-requisite DevOps experience. Escalated.','KT remains paused. New DevOps resources being sourced by TCS. Approved by Matt Law.','New TCS DevOps resources onboarded. KT to re-commence 24/02.','Dev Ops KT Paused/Delayed due to insufficient experience from TCS resources. New resources onboarded by TCS & Approved by Matt Law. KT to re-commence 24/02.']
  const devBlocker = [false,false,false,false,true,true,true,true]
  for (let i = 0; i < 8; i++) {
    const s = devS[i]; const blocker = devBlocker[i]; const risks = blocker ? ['TCS Resources do not have the pre-requisite DevOps experience'] : []; const blockers = blocker ? ['KT paused — TCS DevOps resource capability gap'] : []
    await sub(tDevOps.id, towerUsers[tDevOps.id].twg.id, 'TWG', s, i, devN[i], risks, blockers, blocker)
    await sub(tDevOps.id, towerUsers[tDevOps.id].tcs.id, 'TCS', [s[0]-3,s[1]-3,s[2]-4,s[3]-3,s[4]-3], i, devN[i], risks, blockers, blocker)
  }

  // INTEGRATION — GREEN (QA resourcing dip in Feb)
  const intS = [[80,78,76,79,77],[81,79,77,80,78],[81,80,78,80,79],[80,79,77,79,78],[79,78,75,78,76],[77,77,72,77,74],[77,76,71,76,74],[76,78,72,75,74]]
  const intN = ['Integration KT on track.','Good progress across all integration tracks.','Integration documentation progressing well.','KT on track. Resourcing assessment underway.','Integration KT progressing. QA resource requirement identified.','KT on track. QA Resourcing being finalised with TCS.','KT on track. QA Resource yet to be finalised.','On Track: KT on track — Resourcing assessment completing W/C 23/02. Challenge: QA Resourcing. TCS QA Resource yet to be finalised. Will soon impact KT. Resolution in flight.']
  for (let i = 0; i < 8; i++) {
    const s = intS[i]; const risks = i >= 5 ? ['TCS QA Resource yet to be finalised — will impact KT'] : []
    await sub(tInteg.id, towerUsers[tInteg.id].twg.id, 'TWG', s, i, intN[i], risks)
    await sub(tInteg.id, towerUsers[tInteg.id].tcs.id, 'TCS', [s[0]-3,s[1]-3,s[2]-4,s[3]-3,s[4]-3], i, intN[i], risks)
  }

  // SALESFORCE/WEB APPS — AMBER (App on track, Web blocked)
  const webS = [[68,66,63,67,65],[68,65,62,66,64],[67,64,62,66,63],[66,63,60,65,62],[65,61,58,63,60],[64,60,57,62,59],[63,59,56,61,58],[62,58,55,60,58]]
  const webN = ['Web/App KT underway. App progressing. Web pending TCS Technical Lead.','App on track. Web component waiting on TCS Technical Lead.','App progressing. Web KT not commenced — TCS Technical Lead pending.','App on track. Web KT blocked — TCS Technical Lead pending.','App KT on track — QA Resource Pending. Web — TCS Tech Lead Pending — KT Blocked.','App KT on track. Web — TCS Technical Lead Pending — KT Blocked. Timeline not at risk.','App KT on track — QA Resource Pending. Web — TCS Technical Lead Pending — KT Blocked.','App KT is on track — QA Resource Pending. Web — TCS Technical Lead Pending — KT Blocked. Timeline not at risk.']
  for (let i = 0; i < 8; i++) {
    const s = webS[i]; const risks = ['TCS Technical Lead for Web not yet assigned']; const blockers = i >= 3 ? ['Web KT Blocked — TCS Technical Lead Pending'] : []
    await sub(tWebApp.id, towerUsers[tWebApp.id].twg.id, 'TWG', s, i, webN[i], risks, blockers)
    await sub(tWebApp.id, towerUsers[tWebApp.id].tcs.id, 'TCS', [s[0]-5,s[1]-5,s[2]-6,s[3]-5,s[4]-5], i, webN[i], risks, blockers)
  }

  // DATA & ANALYTICS — AMBER
  const dataS = [[72,70,68,71,69],[72,70,67,71,68],[71,69,66,70,67],[70,68,65,69,66],[69,66,63,68,64],[68,65,61,67,63],[66,63,60,65,61],[65,62,58,63,60]]
  for (let i = 0; i < 8; i++) {
    const s = dataS[i]
    await sub(tData.id, towerUsers[tData.id].twg.id, 'TWG', s, i, 'On track: KT Underway.')
    await sub(tData.id, towerUsers[tData.id].tcs.id, 'TCS', [s[0]-4,s[1]-4,s[2]-5,s[3]-4,s[4]-4], i, 'On track: KT Underway. TCS team building knowledge.')
  }

  // CYBER SECURITY — GREEN (improving)
  const cybS = [[80,78,76,79,77],[81,79,77,80,78],[81,80,78,80,79],[82,80,78,81,79],[82,81,79,81,80],[83,81,79,82,80],[83,82,80,82,81],[84,82,80,83,81]]
  for (let i = 0; i < 8; i++) {
    const s = cybS[i]
    await sub(tCyber.id, towerUsers[tCyber.id].twg.id, 'TWG', s, i, 'On track: KT Underway.')
    await sub(tCyber.id, towerUsers[tCyber.id].tcs.id, 'TCS', [s[0]-3,s[1]-3,s[2]-4,s[3]-3,s[4]-3], i, 'On track: KT Underway. TCS team progressing well.')
  }

  // INFRA, CLOUD & NETWORK — GREEN
  const cldS = [[79,77,75,78,76],[80,78,76,79,77],[80,79,77,80,78],[81,79,77,80,78],[82,80,78,81,79],[82,81,79,81,80],[83,81,79,82,80],[83,82,80,82,80]]
  for (let i = 0; i < 8; i++) {
    const s = cldS[i]
    await sub(tCloud.id, towerUsers[tCloud.id].twg.id, 'TWG', s, i, 'On track: KT Underway.')
    await sub(tCloud.id, towerUsers[tCloud.id].tcs.id, 'TCS', [s[0]-3,s[1]-3,s[2]-4,s[3]-3,s[4]-3], i, 'On track: KT Underway.')
  }

  // SERVICE MANAGEMENT — GREEN
  const svcS = [[79,77,75,78,76],[80,78,76,79,77],[80,79,77,80,78],[81,79,77,80,78],[81,80,78,81,79],[82,80,78,81,79],[82,81,79,82,80],[83,81,79,82,80]]
  for (let i = 0; i < 8; i++) {
    const s = svcS[i]
    await sub(tSvcMgmt.id, towerUsers[tSvcMgmt.id].twg.id, 'TWG', s, i, 'On track: KT Underway.')
    await sub(tSvcMgmt.id, towerUsers[tSvcMgmt.id].tcs.id, 'TCS', [s[0]-3,s[1]-3,s[2]-4,s[3]-3,s[4]-3], i, 'On track: KT Underway.')
  }
  console.log('✓ Group 1 submissions (9 towers × 8 weeks × 2 orgs)')

  // ─── GROUP 2 SUBMISSIONS ──────────────────────────────────────────────────

  // MERCH — RED (IT access issues; access resolved 20/02 except QTUI)
  const merS = [[72,68,65,70,67],[70,66,63,68,65],[68,64,60,66,62],[65,61,57,63,59],[45,40,35,42,37],[35,30,25,32,28],[38,33,28,35,30],[35,32,28,33,30]]
  const merN = ['Merch KT underway. KT Sessions and Timeline on track.','KT progressing. SOP creation commenced.','KT Sessions continuing. Access requests in progress.','IT access issues beginning to impact hands-on practice.','IT Access impacting KT. TCS team unable to perform hands-on practice.','Merch system UAT access delay severely impacting TCS KT activities. Escalated.','IT access partially restored. QTUI exception remains. Working group convened.','On track: KT Sessions, Timeline, SOP and Assessment. Challenge: IT Access — TCS unable to hand on practice, potential timeline impact. Access issues resolved 20/02 except QTUI.']
  for (let i = 0; i < 8; i++) {
    const s = merS[i]; const risks = i >= 4 ? ['Delay in Merch system UAT access impacting hands-on KT'] : []
    await sub(tMerch.id, towerUsers[tMerch.id].twg.id, 'TWG', s, i, merN[i], risks)
    await sub(tMerch.id, towerUsers[tMerch.id].tcs.id, 'TCS', [s[0]-5,s[1]-5,s[2]-6,s[3]-5,s[4]-5], i, merN[i], risks)
  }

  // OMNI — AMBER (SOP delay, SME availability)
  const omniS = [[70,68,66,69,67],[70,68,65,69,66],[69,67,64,68,65],[68,66,63,67,64],[66,63,60,65,62],[64,61,58,63,60],[63,60,56,62,59],[62,58,55,60,58]]
  const omniN = ['Omni KT on track. KT Sessions and Timeline progressing.','KT progressing. Access requests being processed.','KT on track. Timeline on schedule.','Omni KT continuing. SOP creation underway.','SOP and Assessment progressing. Key TCS SME availability being managed.','Delay in SOP and Assessment becoming apparent. TCS SME scheduling challenge.','Key TCS SME availability impacting assessment progress. Onshore/offshore decision pending.','On track: KT Sessions, Timeline and Access requests. Challenge: Delay in SOP and Assessment, Key TCS SME availability.']
  for (let i = 0; i < 8; i++) {
    const s = omniS[i]; const risks = i >= 5 ? ['Delayed priority SME onboarding', 'Decision pending around onshore/offshore placement'] : []
    await sub(tOmni.id, towerUsers[tOmni.id].twg.id, 'TWG', s, i, omniN[i], risks)
    await sub(tOmni.id, towerUsers[tOmni.id].tcs.id, 'TCS', [s[0]-4,s[1]-4,s[2]-5,s[3]-4,s[4]-4], i, omniN[i], risks)
  }

  // PAYROLL & TA — AMBER (Week 5/6 delayed, SME capacity)
  const payS = [[72,70,68,71,69],[72,70,67,71,68],[70,68,66,69,67],[69,67,64,68,66],[66,63,60,65,62],[64,61,57,63,59],[63,60,56,62,59],[64,60,57,62,60]]
  const payN = ['Payroll & TA KT underway. KT Sessions and Timeline on track.','KT progressing. Resourcing confirmed. Access requests submitted.','KT Sessions progressing well. Documentation underway.','KT on track. Week 5/6 planning being reviewed.','SME availability and capacity constraints beginning to impact planning.','Week 5/6 KT planning delayed due to SME Annual Leave and tight timeline.','SME capacity/availability challenge. Capability & Compliance assessment underway.','On track: KT Sessions, Timeline, Resourcing, Access requests. Challenges: Week 5/6 KT planning delayed, SME availability/capacity/Annual Leave/tight timeline.']
  for (let i = 0; i < 8; i++) {
    const s = payS[i]; const risks = i >= 4 ? ['SME availability and capacity constraints', 'Capability & Compliance assessment required'] : []
    await sub(tPayroll.id, towerUsers[tPayroll.id].twg.id, 'TWG', s, i, payN[i], risks)
    await sub(tPayroll.id, towerUsers[tPayroll.id].tcs.id, 'TCS', [s[0]-4,s[1]-4,s[2]-5,s[3]-4,s[4]-4], i, payN[i], risks)
  }

  // SUPPLY CHAIN — GREEN (consistently on track)
  const supS = [[79,77,75,78,76],[80,78,76,79,77],[80,79,77,80,78],[81,79,77,80,78],[82,80,78,81,79],[82,81,79,81,80],[83,81,79,82,80],[79,77,75,78,76]]
  for (let i = 0; i < 8; i++) {
    const s = supS[i]
    await sub(tSupply.id, towerUsers[tSupply.id].twg.id, 'TWG', s, i, 'On track: KT Sessions, Timeline, Resourcing.')
    await sub(tSupply.id, towerUsers[tSupply.id].tcs.id, 'TCS', [s[0]-3,s[1]-3,s[2]-4,s[3]-3,s[4]-3], i, 'On track: KT Sessions, Timeline, Resourcing. No risks identified.')
  }
  console.log('✓ Group 2 submissions (4 towers × 8 weeks × 2 orgs)')

  // ─── GROUP 3 SUBMISSIONS ──────────────────────────────────────────────────

  // CUSTOMER SERVICE — GREEN (TWL/WSL SOP quality needs improvement)
  const csS = [[79,77,75,78,76],[80,78,76,79,77],[80,79,77,80,78],[80,79,77,80,78],[79,78,75,79,77],[78,77,73,78,76],[77,76,72,77,75],[76,78,72,75,74]]
  const csN = ['Customer Service KT underway. NLG, Admin Support and TWL/WSL sessions commenced.','KT progressing across all Customer Service streams. SOP creation underway.','NLG and Admin Support on track. TWL/WSL KT continuing.','KT on track across all streams. SOP quality review in progress.','NLG: on track. Admin Support: on track. TWL/WSL: progressing.','SOP quality good for NLG and Admin. TWL/WSL SOP quality needs improvement.','TWL/WSL KT lead capability concern flagged. Additional coaching being arranged.','NLG: On-track. SOP quality good. Admin Support: On-track. SOP quality good. TWL/WSL: On-track. SOP quality needs improvement. Flagged concern over experience of KT lead.']
  for (let i = 0; i < 8; i++) {
    const s = csS[i]; const risks = i >= 6 ? ['KT lead for TWL/WSL having difficulty absorbing/understanding KT content'] : []
    await sub(tCustSvc.id, towerUsers[tCustSvc.id].twg.id, 'TWG', s, i, csN[i], risks)
    await sub(tCustSvc.id, towerUsers[tCustSvc.id].tcs.id, 'TCS', [s[0]-3,s[1]-3,s[2]-4,s[3]-3,s[4]-3], i, csN[i], risks)
  }

  // COMMERCIAL & SERVICES — AMBER (Insurance on hold)
  const comS = [[70,68,66,69,67],[70,68,65,69,66],[69,67,64,68,65],[68,66,63,67,64],[67,64,61,66,63],[65,62,58,64,61],[63,61,56,62,59],[62,60,55,61,58]]
  const comN = ['Commercial & Services KT underway. Bookings and Insurance sessions commenced.','KT progressing. Bookings KT on track.','Bookings KT progressing well. Insurance track underway.','Bookings on track. Insurance documentation in progress.','Bookings: on track. Insurance: pending partner requirements.','Bookings: on track. SOP quality good. Insurance: awaiting partner sign-off.','Bookings: on track. Insurance: on hold — partner sign-off pending to proceed.','Bookings: On-track. SOP quality good. Insurance: On hold pending partner sign off to proceed.']
  for (let i = 0; i < 8; i++) {
    const s = comS[i]; const risks = i >= 5 ? ['Insurance KT on hold — partner sign-off required'] : []
    await sub(tComSvc.id, towerUsers[tComSvc.id].twg.id, 'TWG', s, i, comN[i], risks, i >= 6 ? ['Insurance KT blocked pending partner sign-off'] : [])
    await sub(tComSvc.id, towerUsers[tComSvc.id].tcs.id, 'TCS', [s[0]-4,s[1]-4,s[2]-5,s[3]-4,s[4]-4], i, comN[i], risks)
  }
  console.log('✓ Group 3 submissions (2 towers × 8 weeks × 2 orgs)')

  // ─── ACTIONS ──────────────────────────────────────────────────────────────
  const actions = [
    // Finance
    { towerId: tFinance.id, ownerId: towerUsers[tFinance.id].tcs.id, title: 'Finance TCS Resourcing: Complete AP onboarding & confirm further joiners by 23/02', description: 'Additional AP resources already onboarded. Further joiners planned. Leadership oversight in place. Detailed plan insight due 23/02 (Siva – TCS).', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2026-02-23T00:00:00.000Z') },
    { towerId: tFinance.id, ownerId: towerUsers[tFinance.id].twg.id, title: 'Finance: Launch breakout functional area daily standups for delivery discipline', description: 'Breakout functional area daily standups to provide specific feedback/action loops for more direct accountability and ownership.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2026-02-27T00:00:00.000Z') },
    { towerId: tFinance.id, ownerId: towerUsers[tFinance.id].tcs.id, title: 'Finance: Stabilise critical roles with daily evidence of independent task completion', description: 'Stabilise GA Group / Fixed Assets / FBP-TWS critical roles. Track with daily evidence of independent task completion before reducing TWG support. Move to metric-based assessment.', status: 'OPEN', priority: 'CRITICAL', dueDate: new Date('2026-03-06T00:00:00.000Z') },
    // Dev Ops
    { towerId: tDevOps.id, ownerId: towerUsers[tDevOps.id].tcs.id, title: 'DevOps: New TCS resources to commence KT re-start on 24/02 (approved by Matt Law)', description: 'New DevOps resources onboarded by TCS & Approved by Matt Law. KT to re-commence 24/02.', status: 'IN_PROGRESS', priority: 'CRITICAL', dueDate: new Date('2026-02-24T00:00:00.000Z') },
    // Integration
    { towerId: tInteg.id, ownerId: towerUsers[tInteg.id].tcs.id, title: 'Integration: Finalise TCS QA Resource assignment (completing W/C 23/02)', description: 'TCS QA Resource yet to be finalised. Will soon impact KT. Resolution in flight with TCS. ETA pending.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2026-02-27T00:00:00.000Z') },
    // Web/App
    { towerId: tWebApp.id, ownerId: towerUsers[tWebApp.id].tcs.id, title: 'Web/App: Assign TCS Technical Lead for Web KT (currently blocked)', description: 'Web KT is blocked pending TCS Technical Lead assignment. App KT continues independently. Timeline not at risk but needs urgent resolution.', status: 'OPEN', priority: 'HIGH', dueDate: new Date('2026-02-27T00:00:00.000Z') },
    // WMS
    { towerId: tWMS.id, ownerId: towerUsers[tWMS.id].twg.id, title: 'WMS: Confirm IT access fully restored and KT back on track post 20/02', description: 'IT Access Resolved 20/02. KT recoverable. No impact to timeline.', status: 'DONE', priority: 'MEDIUM', dueDate: new Date('2026-02-20T00:00:00.000Z'), resolvedAt: new Date('2026-02-20T00:00:00.000Z') },
    // Merch
    { towerId: tMerch.id, ownerId: towerUsers[tMerch.id].twg.id, title: 'Merch: Resolve QTUI access exception remaining from 20/02 resolution', description: 'Access issues resolved 20/02 with the exception of QTUI. Working group convened. Resolve QTUI access to restore full hands-on practice capability.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2026-02-27T00:00:00.000Z') },
    // Omni
    { towerId: tOmni.id, ownerId: towerUsers[tOmni.id].tcs.id, title: 'Omni: Confirm TCS SME onboarding and onshore/offshore placement decision', description: 'Delayed priority SME onboarding. Decision pending around onshore/offshore placement.', status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: new Date('2026-02-27T00:00:00.000Z') },
    // Customer Service
    { towerId: tCustSvc.id, ownerId: towerUsers[tCustSvc.id].twg.id, title: 'Customer Service: Provide additional coaching to TWL/WSL KT lead', description: 'KT lead for TWL/WSL is having difficulty absorbing/understanding content of KT. Additional coaching and resources being provided.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2026-03-06T00:00:00.000Z') },
    // Commercial & Services
    { towerId: tComSvc.id, ownerId: towerUsers[tComSvc.id].twg.id, title: 'Commercial & Services: Obtain partner sign-off to proceed with Insurance KT', description: 'Insurance KT is on hold pending partner sign off to proceed.', status: 'OPEN', priority: 'HIGH', dueDate: new Date('2026-02-27T00:00:00.000Z') },
    // Payroll
    { towerId: tPayroll.id, ownerId: towerUsers[tPayroll.id].twg.id, title: 'Payroll & TA: Complete Week 5/6 KT planning and confirm SME schedule', description: 'Week 5/6 KT planning delayed due to SME Annual Leave/tight timeline. Implement robust skills and competency assessment criteria.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2026-02-27T00:00:00.000Z') },
  ]
  for (const a of actions) { await prisma.action.create({ data: a }) }
  console.log(`✓ ${actions.length} Actions`)

  // ─── RAIDD LOG ────────────────────────────────────────────────────────────
  const raidds = [
    // RISKS
    { type: 'RISK', towerId: tFinance.id, title: 'Capability gaps in judgement-based finance roles (GA Group/Fixed Assets/FBP-TWS)', description: 'TCS team demonstrating capability in defined transactional work but significant gaps in judgement-based roles. Limited independence despite SOPs, walkthroughs and shadowing.', impact: 'HIGH', probability: 'HIGH', status: 'OPEN', owner: 'Stefan Knight', mitigation: 'Stabilise critical roles with daily evidence of independent task completion. Move from subjective to metric-based assessment before reducing TWG support.' },
    { type: 'RISK', towerId: tFinance.id, title: 'AP and FBP capacity timing misaligned with planned onshore exits', description: 'Accounts Payable and FBP resource capacity not aligned with TWG onshore exit timelines. Growing risk to transition milestones.', impact: 'HIGH', probability: 'MEDIUM', status: 'OPEN', owner: 'Siva Changalwala', mitigation: 'Additional TCS AP resources onboarded. Detailed capacity plan due 23/02 (Siva). Leadership oversight in place.' },
    { type: 'RISK', towerId: tDevOps.id, title: 'TCS DevOps Resources lack pre-requisite experience for KT', description: 'Deployed TCS DevOps resources did not have the pre-requisite experience required to absorb KT content. KT paused as a result.', impact: 'HIGH', probability: 'LOW', status: 'IN_PROGRESS', owner: 'Francois Jacobs', mitigation: 'New DevOps resources onboarded by TCS & Approved by Matt Law. KT to re-commence 24/02.' },
    { type: 'RISK', towerId: tInteg.id, title: 'TCS QA Resource for Integration not yet finalised', description: 'QA resourcing gap will soon start to impact Integration KT progress. Resolution in flight with TCS.', impact: 'MEDIUM', probability: 'MEDIUM', status: 'OPEN', owner: 'Francois Jacobs', mitigation: 'Resolution in flight with TCS. Resourcing assessment completing W/C 23/02. ETA pending.' },
    { type: 'RISK', towerId: tWebApp.id, title: 'TCS Technical Lead for Web component not yet assigned', description: 'Web KT blocked pending TCS Technical Lead assignment. App KT continues independently.', impact: 'MEDIUM', probability: 'MEDIUM', status: 'OPEN', owner: 'Pradeep Kotegar', mitigation: 'Timeline not at risk currently. TCS to assign Technical Lead as priority.' },
    { type: 'RISK', towerId: tMerch.id, title: 'Merch system UAT access delay impacted hands-on KT (QTUI exception remains)', description: 'Delay in Merch system UAT access has impacted hands-on transition KT activities. Impact to timeline requires assessment. Access issues resolved 20/02 with exception of QTUI.', impact: 'HIGH', probability: 'MEDIUM', status: 'IN_PROGRESS', owner: 'Carrie Fairley', mitigation: 'Access issues resolved 20/02 except QTUI. Working group convened. QTUI resolution in progress.' },
    { type: 'RISK', towerId: tOmni.id, title: 'Delayed TCS SME onboarding and onshore/offshore placement decision pending', description: 'Priority SME onboarding delayed. Decision pending around onshore/offshore placement for TCS team.', impact: 'MEDIUM', probability: 'MEDIUM', status: 'OPEN', owner: 'Cameron K', mitigation: 'In progress with TCS. Escalated to TCS Transition Manager.' },
    { type: 'RISK', towerId: tPayroll.id, title: 'Payroll & TA Capability & Compliance risk', description: 'SME availability and capacity constraints delaying KT. Annual leave and tight timeline creating Capability & Compliance risk for Payroll & TA.', impact: 'MEDIUM', probability: 'HIGH', status: 'OPEN', owner: 'Kim Nicholas', mitigation: 'Robust skills and competency assessment criteria being implemented. Clear demonstration of KT comprehension required.' },
    { type: 'RISK', towerId: tCustSvc.id, title: 'TWL/WSL KT lead having difficulty absorbing KT content', description: 'KT lead for TWL/WSL stream of Customer Service is having difficulty absorbing/understanding content of KT.', impact: 'MEDIUM', probability: 'MEDIUM', status: 'IN_PROGRESS', owner: 'Hayley McNab', mitigation: 'Additional coaching and resources being provided to support TWL/WSL KT lead.' },
    { type: 'RISK', towerId: tComSvc.id, title: 'Insurance KT on hold pending partner sign-off', description: 'Commercial & Services Insurance track cannot proceed without partner sign-off. Blocking KT completion for this stream.', impact: 'MEDIUM', probability: 'LOW', status: 'OPEN', owner: 'Kim Nicholas', mitigation: 'Engagement underway with partner to obtain sign-off and unblock KT.' },
    // ISSUES
    { type: 'ISSUE', towerId: tDevOps.id, title: 'DevOps KT paused — TCS resources lack pre-requisite DevOps experience', description: 'Dev Ops KT Paused/Delayed due to insufficient experience from TCS resources. New resources have been onboarded and approved by Matt Law.', impact: 'HIGH', status: 'IN_PROGRESS', owner: 'Francois Jacobs', mitigation: 'New DevOps resources onboarded by TCS & Approved by Matt Law. KT to re-commence 24/02.' },
    { type: 'ISSUE', towerId: tFinance.id, title: 'Inconsistent delivery discipline (updates, plans, urgency) eroding stakeholder confidence', description: 'Inconsistent delivery of daily updates, plans, and urgency signals from Finance TCS team is eroding TWG confidence in transition progress.', impact: 'HIGH', status: 'OPEN', owner: 'Stefan Knight', mitigation: 'Breakout functional area daily standups being implemented for specific feedback/action loops and direct accountability.' },
    { type: 'ISSUE', towerId: tMerch.id, title: 'Merch IT access blocked TCS team from hands-on KT practice', description: 'IT access issues prevented TCS team from performing hands-on Merch system practice. Access resolved 20/02 except QTUI.', impact: 'HIGH', status: 'IN_PROGRESS', owner: 'Carrie Fairley', mitigation: 'Access resolved 20/02 (except QTUI). Remediation plan in place for remaining access.' },
    { type: 'ISSUE', towerId: tWMS.id, title: 'WMS Application Related Access blocked KT (resolved 20/02)', description: 'WMS application access issues impacted KT activities for several weeks. Fully resolved 20/02.', impact: 'MEDIUM', status: 'CLOSED', owner: 'Matt Law', closedAt: new Date('2026-02-20T00:00:00.000Z'), mitigation: 'IT resolved access 20/02. KT recoverable. No impact to timeline.' },
    // DEPENDENCIES
    { type: 'DEPENDENCY', towerId: tDevOps.id, title: 'DevOps KT re-start dependent on new TCS resources commencing 24/02', description: 'KT re-commencement is dependent on new TCS DevOps resources starting on 24/02 as approved by Matt Law.', impact: 'HIGH', status: 'IN_PROGRESS', owner: 'Krishna Kalluri', dueDate: new Date('2026-02-24T00:00:00.000Z') },
    { type: 'DEPENDENCY', towerId: tInteg.id, title: 'Integration KT dependent on TCS QA Resource assignment (W/C 23/02)', description: 'Resourcing assessment completing W/C 23/02. QA Resource assignment is a prerequisite for QA KT tracks.', impact: 'MEDIUM', status: 'OPEN', owner: 'Krishna Kalluri', dueDate: new Date('2026-02-27T00:00:00.000Z') },
    { type: 'DEPENDENCY', towerId: tWebApp.id, title: 'Web KT dependent on TCS Technical Lead assignment', description: 'Web component of Salesforce/Web Apps KT cannot commence without TCS Technical Lead being assigned.', impact: 'MEDIUM', status: 'OPEN', owner: 'Pradeep Kotegar', dueDate: new Date('2026-02-27T00:00:00.000Z') },
    { type: 'DEPENDENCY', towerId: tComSvc.id, title: 'Insurance KT dependent on partner sign-off to proceed', description: 'Commercial & Services Insurance track is blocked pending formal partner sign-off.', impact: 'MEDIUM', status: 'OPEN', owner: 'Kim Nicholas' },
    { type: 'DEPENDENCY', towerId: tFinance.id, title: 'Finance TCS Resourcing plan dependent on Siva (TCS) detailed plan by 23/02', description: 'Detailed TCS resourcing plan for Finance expected from Siva (TCS) by 23/02.', impact: 'HIGH', status: 'OPEN', owner: 'Siva Changalwala', dueDate: new Date('2026-02-23T00:00:00.000Z') },
    // ASSUMPTIONS
    { type: 'ASSUMPTION', towerId: tFinance.id, title: 'SOPs being created for Finance will suffice for BAU handover', description: 'Assumed that the SOPs currently being developed (Accounts Payable, GA Group, Fixed Assets, FBP-TWS) will provide adequate documentation for BAU operations post-transition.', impact: 'HIGH', status: 'OPEN', owner: 'Stefan Knight' },
    { type: 'ASSUMPTION', towerId: tDevOps.id, title: 'New TCS DevOps resources starting 24/02 will have adequate pre-requisite experience', description: 'Assumed that the replacement TCS DevOps resources approved by Matt Law and onboarded for 24/02 start will have the required pre-requisite DevOps experience.', impact: 'HIGH', status: 'OPEN', owner: 'Francois Jacobs' },
    { type: 'ASSUMPTION', towerId: tInteg.id, title: 'TCS QA Resourcing gap will be resolved by W/C 23/02', description: 'Assumed resolution of QA resource gap will be confirmed by W/C 23/02 as per current TCS resourcing assessment timeline.', impact: 'MEDIUM', status: 'OPEN', owner: 'Francois Jacobs' },
    // DECISIONS
    { type: 'DECISION', towerId: tFinance.id, title: 'Approve metric-based readiness assessment criteria for Finance capability sign-off', description: 'Decision required: Move Finance KT sign-off from subjective to metric-based assessment. Define daily evidence thresholds for GA Group / Fixed Assets / FBP-TWS critical roles before reducing TWG support.', impact: 'HIGH', status: 'OPEN', owner: 'Russell Charman' },
    { type: 'DECISION', towerId: tDevOps.id, title: 'DevOps: New TCS resource onboarding approved by Matt Law (APPROVED 20/02)', description: 'New DevOps resources onboarded by TCS & Approved by Matt Law. KT to re-commence 24/02.', impact: 'HIGH', status: 'CLOSED', closedAt: new Date('2026-02-20T00:00:00.000Z'), owner: 'Matt Law' },
    { type: 'DECISION', towerId: tWebApp.id, title: 'Assign TCS Technical Lead to unblock Web KT', description: 'Web KT is blocked pending TCS Technical Lead. Decision required on resource assignment to unblock.', impact: 'MEDIUM', status: 'OPEN', owner: 'Chandra Subramanian' },
    { type: 'DECISION', towerId: tOmni.id, title: 'Omni: Confirm onshore/offshore placement for TCS SME team', description: 'Decision pending around onshore/offshore placement for priority TCS SME onboarding.', impact: 'MEDIUM', status: 'OPEN', owner: 'Yamuna Kumar' },
    { type: 'DECISION', towerId: tComSvc.id, title: 'Commercial & Services: Obtain partner approval for Insurance KT to proceed', description: 'Insurance KT on hold pending partner sign-off. Formal partner decision required.', impact: 'MEDIUM', status: 'OPEN', owner: 'Jason Lay Yee' },
  ]
  for (const r of raidds) { await prisma.raiddLog.create({ data: r as Parameters<typeof prisma.raiddLog.create>[0]['data'] }) }
  console.log(`✓ ${raidds.length} RAIDD entries`)

  // ─── MILESTONES (from Transition Timeline) ────────────────────────────────
  const milestones = [
    // Finance (Volume Ramp Up — no standard SS/PS)
    { towerId: tFinance.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tFinance.id, name: 'Volume Ramp Up Commenced', phase: 'VOLUME_RAMP_UP', plannedDate: new Date('2026-02-06'), status: 'IN_PROGRESS', notes: 'Ongoing — SOP creation progressing, capability gaps being addressed' },
    { towerId: tFinance.id, name: 'Finance Tollgate — Capability Sign-Off', phase: 'TOLLGATE', plannedDate: new Date('2026-03-27'), status: 'PENDING' },
    // WMS
    { towerId: tWMS.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tWMS.id, name: 'KT Complete', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'IN_PROGRESS' },
    { towerId: tWMS.id, name: 'Shadow Supervised', phase: 'SS', plannedDate: new Date('2026-03-13'), status: 'PENDING' },
    { towerId: tWMS.id, name: 'Parallel Support', phase: 'PS', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
    // Dev Ops
    { towerId: tDevOps.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tDevOps.id, name: 'KT Complete', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'AT_RISK', notes: 'KT paused — re-commencing 24/02 with new resources' },
    { towerId: tDevOps.id, name: 'Shadow Supervised', phase: 'SS', plannedDate: new Date('2026-03-13'), status: 'AT_RISK' },
    { towerId: tDevOps.id, name: 'Parallel Support', phase: 'PS', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
    // Integration
    { towerId: tInteg.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tInteg.id, name: 'KT Complete', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'IN_PROGRESS' },
    { towerId: tInteg.id, name: 'Shadow Supervised', phase: 'SS', plannedDate: new Date('2026-03-13'), status: 'PENDING' },
    { towerId: tInteg.id, name: 'Parallel Support', phase: 'PS', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
    // Web/App
    { towerId: tWebApp.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tWebApp.id, name: 'KT Complete', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'AT_RISK', notes: 'Web KT blocked on TCS Technical Lead' },
    { towerId: tWebApp.id, name: 'Shadow Supervised', phase: 'SS', plannedDate: new Date('2026-03-13'), status: 'PENDING' },
    { towerId: tWebApp.id, name: 'Parallel Support', phase: 'PS', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
    // Data
    { towerId: tData.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tData.id, name: 'KT Complete', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'IN_PROGRESS' },
    { towerId: tData.id, name: 'Shadow Supervised', phase: 'SS', plannedDate: new Date('2026-03-13'), status: 'PENDING' },
    { towerId: tData.id, name: 'Parallel Support', phase: 'PS', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
    // Cyber, Cloud, Service Mgmt (same pattern)
    ...([tCyber, tCloud, tSvcMgmt] as const).flatMap(t => [
      { towerId: t.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
      { towerId: t.id, name: 'KT Complete', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'IN_PROGRESS' },
      { towerId: t.id, name: 'Shadow Supervised', phase: 'SS', plannedDate: new Date('2026-03-13'), status: 'PENDING' },
      { towerId: t.id, name: 'Parallel Support', phase: 'PS', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
    ]),
    // Merch
    { towerId: tMerch.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tMerch.id, name: 'KT Complete', phase: 'KT', plannedDate: new Date('2026-03-06'), status: 'AT_RISK', notes: 'IT access delays may impact KT completion date' },
    { towerId: tMerch.id, name: 'Ramp Up Complete', phase: 'VRU', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
    // Omni
    { towerId: tOmni.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tOmni.id, name: 'KT Complete (Batch 1)', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'IN_PROGRESS' },
    { towerId: tOmni.id, name: 'Shadow Supervised (Batch 1)', phase: 'SS', plannedDate: new Date('2026-03-13'), status: 'PENDING' },
    { towerId: tOmni.id, name: 'Parallel Support (Batch 1)', phase: 'PS', plannedDate: new Date('2026-03-27'), status: 'PENDING' },
    // Payroll & TA
    { towerId: tPayroll.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tPayroll.id, name: 'KT-TTC Complete', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'AT_RISK', notes: 'Week 5/6 delayed due to SME availability/Annual Leave' },
    { towerId: tPayroll.id, name: 'Ramp Up Complete', phase: 'VRU', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
    // Supply Chain
    { towerId: tSupply.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tSupply.id, name: 'KT Complete', phase: 'KT', plannedDate: new Date('2026-02-13'), status: 'COMPLETE', actualDate: new Date('2026-02-13') },
    { towerId: tSupply.id, name: 'Shadow Supervised', phase: 'SS', plannedDate: new Date('2026-02-27'), status: 'IN_PROGRESS' },
    { towerId: tSupply.id, name: 'Parallel Support', phase: 'PS', plannedDate: new Date('2026-03-13'), status: 'PENDING' },
    // Customer Service (multiple batches)
    { towerId: tCustSvc.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-02-06'), status: 'COMPLETE', actualDate: new Date('2026-02-09') },
    { towerId: tCustSvc.id, name: 'KT-TTT & SOP Complete', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'IN_PROGRESS' },
    { towerId: tCustSvc.id, name: 'TWL KT-TTC (Batch 2)', phase: 'KT', plannedDate: new Date('2026-03-20'), status: 'PENDING' },
    { towerId: tCustSvc.id, name: 'OJT Complete', phase: 'OJT', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
    { towerId: tCustSvc.id, name: 'VRU Complete', phase: 'VRU', plannedDate: new Date('2026-05-01'), status: 'PENDING' },
    // Commercial & Services
    { towerId: tComSvc.id, name: 'Planning Complete', phase: 'PLAN', plannedDate: new Date('2026-01-16'), status: 'COMPLETE', actualDate: new Date('2026-01-16') },
    { towerId: tComSvc.id, name: 'KT Complete', phase: 'KT', plannedDate: new Date('2026-02-27'), status: 'AT_RISK', notes: 'Insurance on hold pending partner sign-off' },
    { towerId: tComSvc.id, name: 'Shadow Supervised', phase: 'SS', plannedDate: new Date('2026-03-13'), status: 'PENDING' },
    { towerId: tComSvc.id, name: 'Parallel Support', phase: 'PS', plannedDate: new Date('2026-04-03'), status: 'PENDING' },
  ]
  for (const m of milestones) { await prisma.milestone.create({ data: m as Parameters<typeof prisma.milestone.create>[0]['data'] }) }
  console.log(`✓ ${milestones.length} Milestones`)

  // ─── ARTEFACTS ────────────────────────────────────────────────────────────
  const artefacts = [
    // Finance
    { towerId: tFinance.id, name: 'Finance SOP — Accounts Payable', type: 'SOP', uploaded: true },
    { towerId: tFinance.id, name: 'Finance SOP — GA Group', type: 'SOP', uploaded: true },
    { towerId: tFinance.id, name: 'Finance SOP — Fixed Assets', type: 'SOP', uploaded: false },
    { towerId: tFinance.id, name: 'Finance SOP — FBP-TWS', type: 'SOP', uploaded: false },
    { towerId: tFinance.id, name: 'Finance KT Training Plan', type: 'TRAINING', uploaded: true },
    { towerId: tFinance.id, name: 'Finance Volume Ramp-Up Architecture', type: 'ARCHITECTURE', uploaded: true },
    // WMS
    { towerId: tWMS.id, name: 'WMS Architecture Overview', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tWMS.id, name: 'WMS KT Runbook', type: 'RUNBOOK', uploaded: true },
    { towerId: tWMS.id, name: 'WMS Process Map', type: 'PROCESS_MAP', uploaded: true },
    { towerId: tWMS.id, name: 'WMS Handover Checklist', type: 'HANDOVER', uploaded: false },
    // Dev Ops
    { towerId: tDevOps.id, name: 'DevOps Architecture Overview', type: 'ARCHITECTURE', uploaded: false },
    { towerId: tDevOps.id, name: 'CI/CD Pipeline Runbook', type: 'RUNBOOK', uploaded: false },
    { towerId: tDevOps.id, name: 'DevOps KT Training Plan', type: 'TRAINING', uploaded: false },
    // Integration
    { towerId: tInteg.id, name: 'Integration Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tInteg.id, name: 'Integration KT Runbook', type: 'RUNBOOK', uploaded: true },
    { towerId: tInteg.id, name: 'Integration Test Plan', type: 'TEST_PLAN', uploaded: true },
    // Web/App
    { towerId: tWebApp.id, name: 'App KT Runbook', type: 'RUNBOOK', uploaded: true },
    { towerId: tWebApp.id, name: 'Salesforce Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tWebApp.id, name: 'Web Architecture', type: 'ARCHITECTURE', uploaded: false },
    { towerId: tWebApp.id, name: 'Web KT Runbook', type: 'RUNBOOK', uploaded: false },
    // Data
    { towerId: tData.id, name: 'Data Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tData.id, name: 'Data Analytics KT Runbook', type: 'RUNBOOK', uploaded: true },
    { towerId: tData.id, name: 'Data Process Map', type: 'PROCESS_MAP', uploaded: false },
    // Cyber
    { towerId: tCyber.id, name: 'Cyber Security Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tCyber.id, name: 'Cyber Security KT Runbook', type: 'RUNBOOK', uploaded: true },
    // Cloud
    { towerId: tCloud.id, name: 'Cloud & Network Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tCloud.id, name: 'Infra KT Runbook', type: 'RUNBOOK', uploaded: true },
    // Service Mgmt
    { towerId: tSvcMgmt.id, name: 'Service Management Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tSvcMgmt.id, name: 'Service Management KT Runbook', type: 'RUNBOOK', uploaded: true },
    // Merch
    { towerId: tMerch.id, name: 'Merch Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tMerch.id, name: 'Merch SOP', type: 'SOP', uploaded: false },
    { towerId: tMerch.id, name: 'Merch KT Training Plan', type: 'TRAINING', uploaded: true },
    // Omni
    { towerId: tOmni.id, name: 'Omni Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tOmni.id, name: 'Omni SOP', type: 'SOP', uploaded: false },
    { towerId: tOmni.id, name: 'Omni KT Runbook', type: 'RUNBOOK', uploaded: true },
    // Payroll
    { towerId: tPayroll.id, name: 'Payroll Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tPayroll.id, name: 'Payroll & TA SOP', type: 'SOP', uploaded: false },
    { towerId: tPayroll.id, name: 'Payroll KT Training Plan', type: 'TRAINING', uploaded: true },
    // Supply Chain
    { towerId: tSupply.id, name: 'Supply Chain Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tSupply.id, name: 'Supply Chain SOP', type: 'SOP', uploaded: true },
    { towerId: tSupply.id, name: 'Supply Chain KT Runbook', type: 'RUNBOOK', uploaded: true },
    { towerId: tSupply.id, name: 'Supply Chain Handover Checklist', type: 'HANDOVER', uploaded: false },
    // Customer Service
    { towerId: tCustSvc.id, name: 'Customer Service Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tCustSvc.id, name: 'NLG KT Runbook', type: 'RUNBOOK', uploaded: true },
    { towerId: tCustSvc.id, name: 'Admin Support SOP', type: 'SOP', uploaded: true },
    { towerId: tCustSvc.id, name: 'TWL/WSL SOP', type: 'SOP', uploaded: false },
    { towerId: tCustSvc.id, name: 'Customer Service Training Plan', type: 'TRAINING', uploaded: true },
    // Commercial & Services
    { towerId: tComSvc.id, name: 'Commercial & Services Architecture', type: 'ARCHITECTURE', uploaded: true },
    { towerId: tComSvc.id, name: 'Bookings SOP', type: 'SOP', uploaded: true },
    { towerId: tComSvc.id, name: 'Insurance SOP', type: 'SOP', uploaded: false },
    { towerId: tComSvc.id, name: 'Services KT Runbook', type: 'RUNBOOK', uploaded: true },
  ]
  for (const a of artefacts) {
    await prisma.artefact.create({ data: { ...a, uploadedAt: a.uploaded ? new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000) : undefined } })
  }
  console.log(`✓ ${artefacts.length} Artefacts`)

  // ─── DAILY KT UPDATES (last 3 days sample) ────────────────────────────────
  const today = new Date('2026-02-20T00:00:00.000Z')
  const dailySamples = [
    { towerId: tFinance.id, userId: towerUsers[tFinance.id].twg.id, updateDate: today, sessionHeld: true, sessionType: 'REMOTE_KT', topicsCovered: 'AP reconciliation walkthrough, FBP-TWS process overview', sessionNotes: 'TCS team engaged but judgement-based task gaps evident. Additional coaching sessions scheduled.', sopProgress: 45, plannedNext: 'Fixed Assets SOP walkthrough' },
    { towerId: tWMS.id, userId: towerUsers[tWMS.id].twg.id, updateDate: today, sessionHeld: true, sessionType: 'SHADOWING', topicsCovered: 'WMS order processing end-to-end', sessionNotes: 'IT access now fully restored. Session productive. TCS team completing hands-on tasks independently.', sopProgress: 78, plannedNext: 'WMS reporting and exception handling' },
    { towerId: tDevOps.id, userId: towerUsers[tDevOps.id].twg.id, updateDate: today, sessionHeld: false, sessionType: undefined, sessionNotes: 'KT paused. New TCS resources confirmed for 24/02. Pre-reading materials sent.', sopProgress: 15, plannedNext: 'KT re-commencement 24/02 with new TCS resources' },
    { towerId: tMerch.id, userId: towerUsers[tMerch.id].twg.id, updateDate: today, sessionHeld: true, sessionType: 'REMOTE_KT', topicsCovered: 'Merch system overview, SOP review', sessionNotes: 'IT access restored except QTUI. Sessions continuing with available systems.', sopProgress: 35, plannedNext: 'Hands-on QTUI walkthrough when access restored' },
  ]
  for (const d of dailySamples) { await prisma.dailyKTUpdate.create({ data: d }) }
  console.log(`✓ ${dailySamples.length} Daily KT updates`)

  // ─── AUDIT LOG ────────────────────────────────────────────────────────────
  for (const t of [tFinance,tWMS,tDevOps,tInteg,tWebApp,tData,tCyber,tCloud,tSvcMgmt,tMerch,tOmni,tPayroll,tSupply,tCustSvc,tComSvc]) {
    await prisma.auditLog.create({ data: { userId: admin.id, action: 'CREATE', resource: 'tower', resourceId: t.id, details: JSON.stringify({ name: t.name, group: t.groupId, source: 'Tower RAG Status 20-Feb-2026' }), createdAt: new Date('2026-02-20T09:00:00.000Z') } })
  }
  console.log('✓ Audit log')

  const subCount = 15 * 2 * 8
  console.log('\n✅ Seed complete — Project Ora Operating Model (20 Feb 2026)')
  console.log(`   Groups: 3 (Group 1: Russell Charman | Group 2: Yamuna Kumar | Group 3: Jason Lay Yee)`)
  console.log(`   Towers: 15 (9 × Group 1, 4 × Group 2, 2 × Group 3)`)
  console.log(`   Users: ~46 (programme leadership + 2 leads per tower)`)
  console.log(`   Submissions: ${subCount} (15 towers × 2 orgs × 8 weeks)`)
  console.log(`   RAIDD entries: ${raidds.length}`)
  console.log(`   Milestones: ${milestones.length}`)
  console.log(`   Actions: ${actions.length}`)
  console.log(`   Artefacts: ${artefacts.length}`)
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
