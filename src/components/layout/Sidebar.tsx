'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: string
  roles?: string[]
}

const NAV: NavItem[] = [
  { href: '/dashboard/programme', label: 'Programme', icon: '🗺️' },
  { href: '/dashboard/executive', label: 'Executive', icon: '📊', roles: ['ADMIN', 'EXEC'] },
  { href: '/submissions/new', label: 'Submit Update', icon: '📝', roles: ['TWG_LEAD', 'TCS_LEAD', 'TWG_OWNER', 'TCS_OWNER'] },
  { href: '/submissions/compare', label: 'Compare', icon: '⚖️' },
  { href: '/raidd', label: 'RAIDD Log', icon: '⚠️' },
  { href: '/milestones', label: 'Milestones', icon: '🏁' },
  { href: '/actions', label: 'Actions', icon: '✅' },
  { href: '/admin', label: 'Admin', icon: '⚙️', roles: ['ADMIN'] },
]

interface Props { session: SessionUser }

export function Sidebar({ session }: Props) {
  const pathname = usePathname()
  const visible = NAV.filter(item => !item.roles || item.roles.includes(session.role))

  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-slate-700">
        <div className="font-bold text-lg">KT Portal</div>
        <div className="text-xs text-slate-400">Project Ora</div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {visible.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
        {session.towerId && (
          <Link
            href={`/dashboard/tower/${session.towerId}`}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.includes('/dashboard/tower/')
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <span>🏗️</span>
            My Tower
          </Link>
        )}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <div className="text-xs text-slate-300 truncate">{session.name}</div>
        <div className="text-xs text-slate-500">{session.role} · {session.org}</div>
      </div>
    </aside>
  )
}
