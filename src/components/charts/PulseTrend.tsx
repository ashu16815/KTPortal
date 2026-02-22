'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { HealthScoreHistoryDTO } from '@/types'
import { formatDate } from '@/lib/utils'

interface Props {
  trend: HealthScoreHistoryDTO[]
  org?: string
}

export function PulseTrend({ trend, org }: Props) {
  const twgData = trend.filter(t => t.org === 'TWG')
  const tcsData = trend.filter(t => t.org === 'TCS')

  const weeks = [...new Set(trend.map(t => t.weekEnding))].sort()
  const chartData = weeks.map(w => ({
    week: formatDate(w),
    TWG: twgData.find(t => t.weekEnding === w)?.totalScore,
    TCS: tcsData.find(t => t.weekEnding === w)?.totalScore,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        {(!org || org === 'TWG') && <Line type="monotone" dataKey="TWG" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
        {(!org || org === 'TCS') && <Line type="monotone" dataKey="TCS" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
      </LineChart>
    </ResponsiveContainer>
  )
}
