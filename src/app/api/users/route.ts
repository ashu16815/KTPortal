// Public endpoint — returns the user list for the login page selector.
// No auth required; user IDs and names are not sensitive in this stub-auth model.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, org: true, towerId: true },
      orderBy: [{ org: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ data: users })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
