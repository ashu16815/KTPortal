'use client'

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts'
import type { WeeklySubmissionDTO } from '@/types'

type ScoreFields = Pick<WeeklySubmissionDTO, 'progressScore' | 'coverageScore' | 'confidenceScore' | 'operationalScore' | 'qualityScore'>

interface Props {
  twg?: ScoreFields
  tcs?: ScoreFields
}

export function ComponentRadar({ twg, tcs }: Props) {
  const data = [
    { subject: 'Progress', TWG: twg?.progressScore, TCS: tcs?.progressScore },
    { subject: 'Coverage', TWG: twg?.coverageScore, TCS: tcs?.coverageScore },
    { subject: 'Confidence', TWG: twg?.confidenceScore, TCS: tcs?.confidenceScore },
    { subject: 'Operational', TWG: twg?.operationalScore, TCS: tcs?.operationalScore },
    { subject: 'Quality', TWG: twg?.qualityScore, TCS: tcs?.qualityScore },
  ]

  if (!twg && !tcs) {
    return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data</div>
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        {twg && <Radar name="TWG" dataKey="TWG" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />}
        {tcs && <Radar name="TCS" dataKey="TCS" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} />}
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  )
}
