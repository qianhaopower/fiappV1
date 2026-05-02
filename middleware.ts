import { NextRequest, NextResponse } from 'next/server'
import { fetchAuthSession } from 'aws-amplify/auth/server'
import { runWithAmplifyServerContext } from '@/utils/amplifyServerUtils'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  try {
    await runWithAmplifyServerContext({
      nextServerContext: { request, response },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    })
  } catch {
    // Not authenticated — let the app handle redirects
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
