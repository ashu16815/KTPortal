import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ data: { loggedOut: true } })
  response.cookies.set('kt_stub_session', '', { path: '/', maxAge: 0 })
  return response
}
