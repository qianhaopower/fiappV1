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

/**
 * True if the request is carrying Cognito session cookies. Used as a
 * safety net so that a transient `fetchAuthSession()` error here can never
 * bounce an authenticated user to /auth — which would trigger an infinite
 * /auth ↔ /decideRoute redirect loop, since AuthGate re-redirects
 * authenticated users back to /decideRoute. See
 * project_auth_hang_identity_pool memory for the 2026-05-13 incident.
 */
function hasCognitoSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) =>
      c.name.startsWith('CognitoIdentityServiceProvider.') &&
      (c.name.endsWith('.accessToken') || c.name.endsWith('.idToken')),
  )
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  if (!isProtectedPage(pathname)) {
    return response
  }

  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { request, response },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    })

    if (session.tokens) {
      return response
    }

    // No tokens from fetchAuthSession — but only redirect if the request
    // really has no Cognito cookies. Otherwise it's a session-resolution
    // hiccup, not a missing session; let client-side guards sort it out
    // rather than risk a redirect loop.
    if (!hasCognitoSessionCookie(request)) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
    return response
  } catch (err) {
    console.error('[middleware] fetchAuthSession failed:', err)
    if (!hasCognitoSessionCookie(request)) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
