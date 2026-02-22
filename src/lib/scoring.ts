import type { ScoreInput, ScoreResult, RAGStatus, ScoringWeightsDTO } from '@/types'

export const DEFAULT_WEIGHTS: Omit<ScoringWeightsDTO, 'id'> = {
  progressWeight: 0.25,
  coverageWeight: 0.25,
  confidenceWeight: 0.20,
  operationalWeight: 0.15,
  qualityWeight: 0.15,
  greenThreshold: 75,
  amberThreshold: 50,
  varianceThreshold: 20,
}

export function calculateScore(input: ScoreInput, weights: Omit<ScoringWeightsDTO, 'id'> = DEFAULT_WEIGHTS): ScoreResult {
  const raw =
    input.progressScore * weights.progressWeight +
    input.coverageScore * weights.coverageWeight +
    input.confidenceScore * weights.confidenceWeight +
    input.operationalScore * weights.operationalWeight +
    input.qualityScore * weights.qualityWeight

  const totalScore = Math.min(100, Math.max(0, Math.round(raw)))
  const ragStatus = determineRAG(totalScore, input.hasActiveBlocker, weights)

  return { totalScore, ragStatus }
}

export function determineRAG(
  score: number,
  hasActiveBlocker: boolean,
  weights: Omit<ScoringWeightsDTO, 'id'> = DEFAULT_WEIGHTS
): RAGStatus {
  if (hasActiveBlocker) return 'RED'
  if (score >= weights.greenThreshold) return 'GREEN'
  if (score >= weights.amberThreshold) return 'AMBER'
  return 'RED'
}

export function calculateVariance(twgTotal: number, tcsTotal: number): number {
  return Math.abs(twgTotal - tcsTotal)
}

export function isVarianceFlagged(variance: number, threshold: number = DEFAULT_WEIGHTS.varianceThreshold): boolean {
  return variance > threshold
}
