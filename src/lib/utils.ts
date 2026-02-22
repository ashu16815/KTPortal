import type { RAGStatus } from '@/types'

// Normalise any date to the Friday of its ISO week
export function normaliseWeekEnding(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  // 0=Sun,1=Mon,...,5=Fri,6=Sat
  const day = d.getDay()
  const diff = day <= 5 ? 5 - day : 6 // if Saturday, go forward 6 to next Friday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatScore(score: number): string {
  return `${score}/100`
}

export function ragColor(rag: RAGStatus): string {
  switch (rag) {
    case 'GREEN': return '#16a34a'
    case 'AMBER': return '#d97706'
    case 'RED': return '#dc2626'
  }
}

export function ragBg(rag: RAGStatus): string {
  switch (rag) {
    case 'GREEN': return 'bg-green-100 text-green-800'
    case 'AMBER': return 'bg-amber-100 text-amber-800'
    case 'RED': return 'bg-red-100 text-red-800'
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function csvExport(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
  return lines.join('\n')
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function safeParseJSON<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

export function getCurrentWeekEnding(): Date {
  return normaliseWeekEnding(new Date())
}
