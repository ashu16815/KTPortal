import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  normaliseWeekEnding,
  csvExport,
  safeParseJSON,
  formatScore,
  ragColor,
  ragBg,
  formatDate,
  cn,
  getCurrentWeekEnding,
} from '../src/lib/utils'
import { calculateVariance as calcVar } from '../src/lib/scoring'

afterEach(() => {
  vi.useRealTimers()
})

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

  it('escapes values with newlines', () => {
    const csv = csvExport(['Note'], [['Line 1\nLine 2']])
    expect(csv).toBe('Note\n"Line 1\nLine 2"')
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

describe('format helpers', () => {
  it('formats score values', () => {
    expect(formatScore(88)).toBe('88/100')
  })

  it('returns expected color values for each RAG status', () => {
    expect(ragColor('GREEN')).toBe('#16a34a')
    expect(ragColor('AMBER')).toBe('#d97706')
    expect(ragColor('RED')).toBe('#dc2626')
  })

  it('returns expected background classes for each RAG status', () => {
    expect(ragBg('GREEN')).toBe('bg-green-100 text-green-800')
    expect(ragBg('AMBER')).toBe('bg-amber-100 text-amber-800')
    expect(ragBg('RED')).toBe('bg-red-100 text-red-800')
  })

  it('formats dates from strings and Date objects', () => {
    expect(formatDate('2026-02-20')).toBe('20 Feb 2026')
    expect(formatDate(new Date(2026, 1, 21))).toBe('21 Feb 2026')
  })

  it('joins truthy class names only', () => {
    expect(cn('btn', undefined, false, null, 'active')).toBe('btn active')
  })

  it('derives the current week ending from the system clock', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T12:00:00Z'))

    expect(getCurrentWeekEnding().toISOString()).toBe('2026-02-20T00:00:00.000Z')
  })
})
