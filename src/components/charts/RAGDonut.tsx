'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { RAGStatus } from '@/types'
import { ragColor } from '@/lib/utils'

interface Props {
  data: { rag: RAGStatus; count: number; label: string }[]
}

export function RAGDonut({ data }: Props) {
  const chartData = data.filter(d => d.count > 0).map(d => ({ name: d.label, value: d.count, rag: d.rag }))

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No submissions yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
          {chartData.map((entry, i) => (
            <Cell key={i} fill={ragColor(entry.rag)} />
          ))}
        </Pie>
        <Tooltip formatter={(v, n) => [v, n]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
