import { describe, it, expect } from 'vitest'
import { calculateScore, determineRAG, calculateVariance, isVarianceFlagged, DEFAULT_WEIGHTS } from '../src/lib/scoring'

const perfectInput = {
  progressScore: 100,
  coverageScore: 100,
  confidenceScore: 100,
  operationalScore: 100,
  qualityScore: 100,
  hasActiveBlocker: false,
}

const lowInput = {
  progressScore: 30,
  coverageScore: 30,
  confidenceScore: 30,
  operationalScore: 30,
  qualityScore: 30,
  hasActiveBlocker: false,
}

describe('calculateScore', () => {
  it('returns 100 for perfect scores', () => {
    const { totalScore, ragStatus } = calculateScore(perfectInput)
    expect(totalScore).toBe(100)
    expect(ragStatus).toBe('GREEN')
  })

  it('returns GREEN for score >= 75', () => {
    const { ragStatus } = calculateScore({ ...perfectInput, progressScore: 75, coverageScore: 75, confidenceScore: 75, operationalScore: 75, qualityScore: 75 })
    expect(ragStatus).toBe('GREEN')
  })

  it('returns AMBER for score 50–74', () => {
    const input = { progressScore: 60, coverageScore: 60, confidenceScore: 60, operationalScore: 60, qualityScore: 60, hasActiveBlocker: false }
    const { ragStatus } = calculateScore(input)
    expect(ragStatus).toBe('AMBER')
  })

  it('returns RED for score < 50', () => {
    const { ragStatus } = calculateScore(lowInput)
    expect(ragStatus).toBe('RED')
  })

  it('forces RED when hasActiveBlocker is true regardless of score', () => {
    const { ragStatus } = calculateScore({ ...perfectInput, hasActiveBlocker: true })
    expect(ragStatus).toBe('RED')
  })

  it('clamps output to 0–100', () => {
    const { totalScore } = calculateScore({ ...perfectInput, progressScore: 200 })
    expect(totalScore).toBeLessThanOrEqual(100)
  })

  it('uses provided weights', () => {
    const heavyProgress = { ...DEFAULT_WEIGHTS, progressWeight: 1, coverageWeight: 0, confidenceWeight: 0, operationalWeight: 0, qualityWeight: 0 }
    const { totalScore } = calculateScore({ ...perfectInput, progressScore: 50, coverageScore: 100 }, heavyProgress)
    expect(totalScore).toBe(50)
  })
})

describe('determineRAG', () => {
  it('returns RED when blocker active', () => {
    expect(determineRAG(90, true)).toBe('RED')
  })

  it('returns GREEN at threshold', () => {
    expect(determineRAG(75, false)).toBe('GREEN')
  })

  it('returns AMBER just below green threshold', () => {
    expect(determineRAG(74, false)).toBe('AMBER')
  })

  it('returns AMBER at amber threshold', () => {
    expect(determineRAG(50, false)).toBe('AMBER')
  })

  it('returns RED below amber threshold', () => {
    expect(determineRAG(49, false)).toBe('RED')
  })

  it('respects custom thresholds', () => {
    const custom = { ...DEFAULT_WEIGHTS, greenThreshold: 80, amberThreshold: 60 }
    expect(determineRAG(79, false, custom)).toBe('AMBER')
    expect(determineRAG(80, false, custom)).toBe('GREEN')
    expect(determineRAG(59, false, custom)).toBe('RED')
  })
})

describe('calculateVariance', () => {
  it('returns absolute difference', () => {
    expect(calculateVariance(80, 60)).toBe(20)
    expect(calculateVariance(60, 80)).toBe(20)
    expect(calculateVariance(70, 70)).toBe(0)
  })
})

describe('isVarianceFlagged', () => {
  it('flags when variance exceeds threshold', () => {
    expect(isVarianceFlagged(21)).toBe(true)
    expect(isVarianceFlagged(20)).toBe(false)
    expect(isVarianceFlagged(0)).toBe(false)
  })

  it('respects custom threshold', () => {
    expect(isVarianceFlagged(15, 10)).toBe(true)
    expect(isVarianceFlagged(10, 10)).toBe(false)
  })
})
