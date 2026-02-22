'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useSession } from '@/hooks/useSession'
import { queryKeys } from '@/hooks/queryKeys'
import { calculateScore } from '@/lib/scoring'
import { RAGBadge } from '@/components/ui/Badge'
import type { TowerDTO } from '@/types'
import { getCurrentWeekEnding, formatDate } from '@/lib/utils'
import { Suspense } from 'react'

const schema = z.object({
  towerId: z.string().min(1, 'Tower required'),
  progressScore: z.coerce.number().min(0).max(100),
  coverageScore: z.coerce.number().min(0).max(100),
  confidenceScore: z.coerce.number().min(0).max(100),
  operationalScore: z.coerce.number().min(0).max(100),
  qualityScore: z.coerce.number().min(0).max(100),
  hasActiveBlocker: z.boolean(),
  narrative: z.string().optional(),
  risks: z.string().optional(),
  blockers: z.string().optional(),
  evidenceLinks: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function ScoreSlider({ label, value, onChange, weight }: {
  label: string; value: number; onChange: (v: number) => void; weight: number
}) {
  const color = value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <label className="font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">weight {(weight * 100).toFixed(0)}%</span>
          <span className={`font-bold text-white text-sm w-10 text-center py-0.5 rounded ${color}`}>{value}</span>
        </div>
      </div>
      <input
        type="range" min={0} max={100} step={5} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: value >= 75 ? '#16a34a' : value >= 50 ? '#d97706' : '#dc2626' }}
      />
      <div className="flex justify-between text-xs text-gray-300">
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>
    </div>
  )
}

function NewSubmissionForm() {
  const { session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const defaultTowerId = searchParams.get('towerId') ?? ''

  const [scores, setScores] = useState({
    progressScore: 70, coverageScore: 70, confidenceScore: 70,
    operationalScore: 70, qualityScore: 70,
  })
  const [hasActiveBlocker, setHasActiveBlocker] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [aiSummary, setAiSummary] = useState('')

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { towerId: defaultTowerId, ...scores, hasActiveBlocker: false },
  })

  const { data: towersData } = useQuery<{ data: TowerDTO[] }>({
    queryKey: queryKeys.towers(),
    queryFn: async () => { const r = await fetch('/api/towers'); return r.json() },
  })

  const liveScore = calculateScore({
    ...scores,
    hasActiveBlocker,
  })

  const SCORE_FIELDS = [
    { key: 'progressScore' as const, label: 'Progress', weight: 0.25 },
    { key: 'coverageScore' as const, label: 'Coverage', weight: 0.25 },
    { key: 'confidenceScore' as const, label: 'Confidence', weight: 0.20 },
    { key: 'operationalScore' as const, label: 'Operational', weight: 0.15 },
    { key: 'qualityScore' as const, label: 'Quality', weight: 0.15 },
  ]

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          weekEnding: getCurrentWeekEnding().toISOString(),
          risks: data.risks ? data.risks.split('\n').filter(Boolean) : [],
          blockers: data.blockers ? data.blockers.split('\n').filter(Boolean) : [],
          evidenceLinks: data.evidenceLinks ? data.evidenceLinks.split('\n').filter(Boolean) : [],
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      return res.json()
    },
    onSuccess: (result) => {
      if (result.data?.aiSummary) setAiSummary(result.data.aiSummary)
      setSubmitted(true)
      queryClient.invalidateQueries({ queryKey: queryKeys.execDashboard() })
      const towerId = watch('towerId')
      if (towerId) queryClient.invalidateQueries({ queryKey: queryKeys.towerDashboard(towerId) })
    },
  })

  const weekEnding = getCurrentWeekEnding()

  if (submitted) {
    const towerId = watch('towerId')
    return (
      <Card className="text-center py-10">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Submission Complete</h2>
        <p className="text-gray-500 mb-2">Health score: <span className="font-bold">{liveScore.totalScore}/100</span></p>
        <RAGBadge rag={liveScore.ragStatus} />
        {aiSummary && (
          <div className="mt-5 text-left p-4 bg-blue-50 rounded-lg border border-blue-100 max-w-md mx-auto">
            <div className="text-xs font-medium text-blue-700 mb-1">AI Summary (Draft)</div>
            <p className="text-sm text-blue-800">{aiSummary}</p>
          </div>
        )}
        <div className="mt-6 flex gap-3 justify-center">
          {towerId && (
            <Button onClick={() => router.push(`/dashboard/tower/${towerId}`)}>
              View Tower Dashboard
            </Button>
          )}
          <Button variant="secondary" onClick={() => router.push('/dashboard/executive')}>Executive View</Button>
        </div>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(d => submit(d))} className="space-y-5">
      {/* Tower */}
      <Card>
        <CardHeader><CardTitle>Tower</CardTitle></CardHeader>
        <select
          {...register('towerId')}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Select a tower...</option>
          {(towersData?.data ?? []).map((t: TowerDTO) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {errors.towerId && <p className="text-xs text-red-600 mt-1">{errors.towerId.message}</p>}
        {session && (
          <p className="text-xs text-gray-400 mt-2">Submitting as: {session.name} ({session.org})</p>
        )}
      </Card>

      {/* Score preview */}
      <Card
        style={{
          borderColor: liveScore.ragStatus === 'GREEN' ? '#16a34a' : liveScore.ragStatus === 'AMBER' ? '#d97706' : '#dc2626',
          borderWidth: '2px',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <CardTitle>Health Index — Live Preview</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{liveScore.totalScore}</span>
            <RAGBadge rag={liveScore.ragStatus} />
          </div>
        </div>

        <div className="space-y-5">
          {SCORE_FIELDS.map(({ key, label, weight }) => (
            <ScoreSlider
              key={key}
              label={label}
              weight={weight}
              value={scores[key]}
              onChange={v => {
                setScores(prev => ({ ...prev, [key]: v }))
                setValue(key, v)
              }}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <input
            type="checkbox"
            id="blocker"
            checked={hasActiveBlocker}
            onChange={e => { setHasActiveBlocker(e.target.checked); setValue('hasActiveBlocker', e.target.checked) }}
            className="rounded border-red-300 accent-red-600"
          />
          <label htmlFor="blocker" className="text-sm font-medium text-red-700 cursor-pointer">
            Active blocker exists (forces RED regardless of score)
          </label>
        </div>
      </Card>

      {/* Narrative */}
      <Card>
        <CardHeader><CardTitle>Narrative & Context</CardTitle></CardHeader>
        <div className="space-y-4">
          <Textarea label="Overall Narrative" {...register('narrative')} rows={4} placeholder="Describe the current KT status, progress, and key activities..." />
          <Textarea label="Risks (one per line)" {...register('risks')} rows={3} placeholder="Identified risk 1&#10;Identified risk 2" />
          <Textarea label="Active Blockers (one per line)" {...register('blockers')} rows={2} placeholder="Blocker description&#10;..." />
          <Textarea label="Evidence Links (one per line)" {...register('evidenceLinks')} rows={2} placeholder="https://confluence.example.com/...&#10;https://..." />
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={isPending}>Submit Weekly Update</Button>
      </div>
    </form>
  )
}

export default function NewSubmissionPage() {
  const weekEnding = getCurrentWeekEnding()
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Weekly KT Submission</h1>
          <p className="text-sm text-gray-500 mt-1">Week ending {formatDate(weekEnding)}</p>
        </div>
        <Suspense fallback={<div className="text-gray-400">Loading form...</div>}>
          <NewSubmissionForm />
        </Suspense>
      </div>
    </AppShell>
  )
}
