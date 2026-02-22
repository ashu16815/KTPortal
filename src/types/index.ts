export type Org = 'TWG' | 'TCS'
export type RAGStatus = 'RED' | 'AMBER' | 'GREEN'
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED'
export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'OVERDUE'
export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type UserRole = 'ADMIN' | 'EXEC' | 'TWG_LEAD' | 'TCS_LEAD' | 'TWG_OWNER' | 'TCS_OWNER'
export type ArtefactType = 'RUNBOOK' | 'ARCHITECTURE' | 'TEST_PLAN' | 'TRAINING' | 'HANDOVER' | 'OTHER'
export type DecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  org: string
  towerId?: string
}

export interface TowerDTO {
  id: string
  name: string
  description?: string
  createdAt: string
}

export interface TrackDTO {
  id: string
  towerId: string
  name: string
  description?: string
}

export interface UserDTO {
  id: string
  email: string
  name: string
  role: UserRole
  org: string
  towerId?: string
}

export interface WeeklySubmissionDTO {
  id: string
  towerId: string
  userId: string
  org: Org
  weekEnding: string
  status: SubmissionStatus
  progressScore: number
  coverageScore: number
  confidenceScore: number
  operationalScore: number
  qualityScore: number
  totalScore: number
  ragStatus: RAGStatus
  narrative?: string
  risks?: string[]
  blockers?: string[]
  evidenceLinks?: string[]
  hasActiveBlocker: boolean
  aiSummary?: string
  aiSummaryApproved: boolean
  createdAt: string
}

export interface ActionDTO {
  id: string
  towerId: string
  ownerId: string
  ownerName?: string
  towerName?: string
  title: string
  description?: string
  status: ActionStatus
  priority: ActionPriority
  dueDate?: string
  resolvedAt?: string
  createdAt: string
}

export interface ArtefactDTO {
  id: string
  towerId: string
  name: string
  type: ArtefactType
  blobUrl?: string
  uploaded: boolean
  uploadedAt?: string
}

export interface DecisionDTO {
  id: string
  towerId?: string
  title: string
  description?: string
  status: DecisionStatus
  decidedAt?: string
  createdAt: string
}

export interface HealthScoreHistoryDTO {
  id: string
  towerId: string
  org: Org
  weekEnding: string
  totalScore: number
  ragStatus: RAGStatus
  progressScore: number
  coverageScore: number
  confidenceScore: number
  operationalScore: number
  qualityScore: number
}

export interface ScoringWeightsDTO {
  id: string
  progressWeight: number
  coverageWeight: number
  confidenceWeight: number
  operationalWeight: number
  qualityWeight: number
  greenThreshold: number
  amberThreshold: number
  varianceThreshold: number
}

export interface ScoreInput {
  progressScore: number
  coverageScore: number
  confidenceScore: number
  operationalScore: number
  qualityScore: number
  hasActiveBlocker: boolean
}

export interface ScoreResult {
  totalScore: number
  ragStatus: RAGStatus
}

export interface TowerHealthSummary {
  tower: TowerDTO
  twgScore?: HealthScoreHistoryDTO
  tcsScore?: HealthScoreHistoryDTO
  variance?: number
  varianceFlagged: boolean
  latestWeekEnding: string
  trend: HealthScoreHistoryDTO[]
  overdueActions: number
  pendingDecisions: number
  artefactCoverage: number // 0-1
}

export interface ExecDashboardPayload {
  towers: TowerHealthSummary[]
  totalSubmissions: number
  weekEnding: string
  generatedAt: string
}

export interface TowerDashboardPayload {
  tower: TowerDTO
  tracks: TrackDTO[]
  latestTwg?: WeeklySubmissionDTO
  latestTcs?: WeeklySubmissionDTO
  trend: HealthScoreHistoryDTO[]
  actions: ActionDTO[]
  artefacts: ArtefactDTO[]
  pendingDecisions: DecisionDTO[]
  weekEnding: string
}

export interface ComparePayload {
  tower: TowerDTO
  weekEnding: string
  twg?: WeeklySubmissionDTO
  tcs?: WeeklySubmissionDTO
  variance?: number
  varianceFlagged: boolean
}

export interface ApiSuccess<T> {
  data: T
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
