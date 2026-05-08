import { NextRequest, NextResponse } from 'next/server'
import { fetchAuthSession } from 'aws-amplify/auth/server'
import { runWithAmplifyServerContext } from '@/utils/amplifyServerUtils'

const PROTECTED_PREFIXES = [
  '/today',
  '/practices',
  '/results',
  '/assessment',
  '/onboarding',
  '/progress',
  '/account',
  '/admin',
  '/decideRoute',
]

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { request, response },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    })

    // Redirect to /auth if tokens are missing on a protected page
    if (!session.tokens && isProtectedPage(pathname)) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  } catch {
    if (isProtectedPage(pathname)) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
