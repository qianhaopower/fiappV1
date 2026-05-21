import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "aws-amplify/auth/server";

import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import { log } from "@/utils/logger";

export type AuthUser = {
  userId: string;
  username?: string | null;
};

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Canonical helper to resolve the authenticated user for a request.
 *
 * - Returns `{ userId, username }` when auth is valid
 * - Throws `UnauthorizedError` when auth is missing/invalid
 *
 * NOTE: The `req` parameter is accepted for future flexibility but is not
 * currently required because Amplify's server adapter uses Next's `cookies()`
 * under the hood.
 */
export async function getUserId(_req?: Request): Promise<AuthUser> {
  try {
    const { user } = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const u = await getCurrentUser(contextSpec);
        return { user: { userId: u.userId, username: u.username } };
      },
    });

    return user;
  } catch {
    throw new UnauthorizedError();
  }
}

/**
 * Cross-user data isolation defense.
 *
 * Every authenticated response carries per-user data. Without these headers
 * the CDN (CloudFront in front of Amplify Hosting) and any intermediate proxy
 * can cache one user's response under the URL alone and serve it back to
 * other users. `no-store` forbids storage; `private` forbids shared caches
 * even if a future change weakens `no-store`; `Vary: Cookie` keys responses
 * by the auth cookie so no cache entry is ever shared across sessions.
 */
function applyNoStoreHeaders(res: Response): Response {
  res.headers.set("Cache-Control", "no-store, private");
  res.headers.set("Vary", "Cookie");
  return res;
}

export function unauthorizedResponse() {
  const res = NextResponse.json(
    {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    },
    { status: 401 },
  );
  return applyNoStoreHeaders(res);
}

export function rateLimitedResponse() {
  const res = NextResponse.json(
    {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests — please slow down",
      },
    },
    { status: 429 },
  );
  return applyNoStoreHeaders(res);
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

/**
 * Like `withAuth`, but allows the request to be unauthenticated.
 *
 * Handler receives `{ user: AuthUser | null }`. Missing/invalid auth resolves
 * to `null` (no 401); only used by endpoints that intentionally accept both
 * authed and anonymous callers (e.g. `POST /api/assessment`). Cache headers
 * are applied the same as `withAuth` — anonymous responses can still carry
 * input-dependent content that we must not let intermediates cache by URL.
 */
export async function withOptionalAuth(
  req: Request | undefined,
  handler: (_args: { user: AuthUser | null }) => Promise<Response>
): Promise<Response> {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const method = req?.method ?? 'UNKNOWN'
  let route = 'unknown'
  if (req?.url) {
    try { route = new URL(req.url).pathname } catch { route = req.url }
  }

  let user: AuthUser | null = null;
  try {
    user = await getUserId(req);
  } catch {
    user = null;
  }

  try {
    const response = await handler({ user })
    const status = response.status
    const outcome = status === 429 ? 'rate_limited' : status < 400 ? 'ok' : 'error'
    // userId omitted from the log line indicates an anonymous caller; we don't
    // need a separate outcome tag for it.
    log({ requestId, route, method, outcome, status, latencyMs: Date.now() - startedAt, userId: user?.userId })
    return applyNoStoreHeaders(response)
  } catch (error) {
    log({ requestId, route, method, outcome: 'error', status: 500, latencyMs: Date.now() - startedAt, userId: user?.userId }, 'error')
    console.error('[withOptionalAuth] handler error:', error);
    return applyNoStoreHeaders(NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    ));
  }
}

/**
 * Guard wrapper for protected API handlers.
 * Resolves user or returns standardized 401 response.
 * Use for all routes that require authentication.
 */
export async function withAuth(
  req: Request | undefined,
  handler: (_user: AuthUser) => Promise<Response>
): Promise<Response> {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const method = req?.method ?? 'UNKNOWN'
  let route = 'unknown'
  if (req?.url) {
    try { route = new URL(req.url).pathname } catch { route = req.url }
  }

  let user: AuthUser;
  try {
    user = await getUserId(req);
  } catch {
    log({ requestId, route, method, outcome: 'unauthorized', status: 401, latencyMs: Date.now() - startedAt })
    return unauthorizedResponse();
  }
  try {
    const response = await handler(user)
    const status = response.status
    const outcome = status === 429 ? 'rate_limited' : status < 400 ? 'ok' : 'error'
    log({ requestId, route, method, outcome, status, latencyMs: Date.now() - startedAt, userId: user.userId })
    return applyNoStoreHeaders(response)
  } catch (error) {
    log({ requestId, route, method, outcome: 'error', status: 500, latencyMs: Date.now() - startedAt, userId: user.userId }, 'error')
    // Amplify Data client throws NoSignedUser when server context isn't
    // propagated — log as warning only, return 500 so decideRoute doesn't
    // redirect authenticated users back to /auth
    if (error instanceof Error && error.name === 'NoSignedUser') {
      console.warn('[withAuth] NoSignedUser in handler — Amplify Data client missing server context')
      return applyNoStoreHeaders(NextResponse.json(
        { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      ))
    }
    console.error('[withAuth] handler error:', error);
    return applyNoStoreHeaders(NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    ));
  }
}

