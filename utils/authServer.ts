import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "aws-amplify/auth/server";

import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";

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
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

/**
 * Guard wrapper for protected API handlers.
 * Resolves user or returns standardized 401 response.
 * Use for all routes that require authentication.
 */
export async function withAuth(
  req: Request | undefined,
  handler: (user: AuthUser) => Promise<Response>
): Promise<Response> {
  let user: AuthUser;
  try {
    user = await getUserId(req);
  } catch {
    return unauthorizedResponse();
  }
  return handler(user);
}

