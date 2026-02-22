import { cn, ragBg } from '@/lib/utils'
import type { RAGStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'rag' | 'success' | 'warning' | 'danger' | 'info'
  rag?: RAGStatus
  className?: string
}

export function Badge({ children, variant = 'default', rag, className }: BadgeProps) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium'
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    rag: rag ? ragBg(rag) : 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={cn(base, variants[variant], className)}>
      {children}
    </span>
  )
}

export function RAGBadge({ rag }: { rag: RAGStatus }) {
  return <Badge variant="rag" rag={rag}>{rag}</Badge>
}
