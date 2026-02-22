import { describe, it, expect } from 'vitest'
import { normaliseWeekEnding, csvExport, safeParseJSON } from '../src/lib/utils'
import { calculateVariance as calcVar } from '../src/lib/scoring'

describe('normaliseWeekEnding', () => {
  // 2026-02-20 = Friday
  it('returns Friday unchanged when given a Friday', () => {
    const result = normaliseWeekEnding('2026-02-20')
    expect(result.toISOString()).toBe('2026-02-20T00:00:00.000Z')
  })

  // 2026-02-16 = Monday → should go to Friday 2026-02-20 (+4 days)
  it('advances Monday to the coming Friday', () => {
    const result = normaliseWeekEnding('2026-02-16')
    expect(result.toISOString()).toBe('2026-02-20T00:00:00.000Z')
  })

  // 2026-02-21 = Saturday → should go back to Friday 2026-02-20 (-1 day)
  it('rolls Saturday back to Friday', () => {
    const result = normaliseWeekEnding('2026-02-21')
    expect(result.toISOString()).toBe('2026-02-20T00:00:00.000Z')
  })

  // 2026-02-22 = Sunday → should go back to Friday 2026-02-20 (-2 days)
  it('rolls Sunday back to Friday', () => {
    const result = normaliseWeekEnding('2026-02-22')
    expect(result.toISOString()).toBe('2026-02-20T00:00:00.000Z')
  })

  // 2026-02-19 = Thursday → +1 → Friday 2026-02-20
  it('advances Thursday to Friday', () => {
    const result = normaliseWeekEnding('2026-02-19')
    expect(result.toISOString()).toBe('2026-02-20T00:00:00.000Z')
  })

  it('accepts Date objects', () => {
    const d = new Date('2026-02-20T12:00:00Z')
    const result = normaliseWeekEnding(d)
    expect(result.toISOString()).toBe('2026-02-20T00:00:00.000Z')
  })
})

describe('csvExport', () => {
  it('generates header and rows', () => {
    const csv = csvExport(['Name', 'Score'], [['Alice', 95], ['Bob', 80]])
    expect(csv).toBe('Name,Score\nAlice,95\nBob,80')
  })

  it('escapes values with commas', () => {
    const csv = csvExport(['Note'], [['Hello, world']])
    expect(csv).toBe('Note\n"Hello, world"')
  })

  it('escapes values with quotes', () => {
    const csv = csvExport(['Msg'], [['"quoted"']])
    expect(csv).toBe('Msg\n"""quoted"""')
  })
})

describe('safeParseJSON', () => {
  it('parses valid JSON', () => {
    expect(safeParseJSON<string[]>('["a","b"]', [])).toEqual(['a', 'b'])
  })

  it('returns fallback for invalid JSON', () => {
    expect(safeParseJSON<string[]>('not-json', [])).toEqual([])
  })

  it('returns fallback for null/undefined', () => {
    expect(safeParseJSON<string[]>(null, [])).toEqual([])
    expect(safeParseJSON<string[]>(undefined, [])).toEqual([])
  })
})

// Re-export for convenience — ensure calculateVariance isn't accidentally imported from utils
describe('scoring.calculateVariance (import check)', () => {
  it('matches expected absolute difference', () => {
    expect(calcVar(85, 60)).toBe(25)
  })
})
