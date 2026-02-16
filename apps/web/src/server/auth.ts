import type { UserRole } from "@cg-dump/shared";
import { getRequestContext as resolveRequestContext, verifyCognitoJwt as verifyJwt, type AuthContext } from "@cg-dump/core";

type AdminContext = AuthContext & { role: "admin" };
type StateUserContext = AuthContext & {
  role: "state_user";
  user: AuthContext["user"] & { stateId: string };
};

export async function withAuth(
  request: Request,
  role?: UserRole | UserRole[]
): Promise<{ ok: true; context: AuthContext } | { ok: false; response: Response }> {
  const resolved = await resolveRequestContext(request);
  if (!resolved.ok) {
    return {
      ok: false,
      response: Response.json(
        {
          error: resolved.error,
          details: resolved.details
        },
        { status: resolved.status }
      )
    };
  }

  if (role) {
    const expected = Array.isArray(role) ? role : [role];
    if (!expected.includes(resolved.context.role)) {
      return {
        ok: false,
        response: Response.json(
          {
            error: "Forbidden",
            details: { role: resolved.context.role }
          },
          { status: 403 }
        )
      };
    }
  }

  if (resolved.context.role === "state_user" && !resolved.context.user.stateId) {
    return {
      ok: false,
      response: Response.json(
        {
          error: "Forbidden",
          details: { message: "State user is missing required state assignment" }
        },
        { status: 403 }
      )
    };
  }

  return { ok: true, context: resolved.context };
}

export async function verifyCognitoJwt(token: string) {
  return verifyJwt(token);
}

export async function getRequestContext(request: Request) {
  return resolveRequestContext(request);
}

export function requireAuth(
  context: AuthContext | null | undefined
): { ok: true; context: AuthContext } | { ok: false; status: number; error: string; details?: unknown } {
  if (!context) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true, context };
}

export function requireAdmin(
  context: AuthContext | null | undefined
): { ok: true; context: AdminContext } | { ok: false; status: number; error: string; details?: unknown } {
  const auth = requireAuth(context);
  if (!auth.ok) return auth;
  if (auth.context.role !== "admin") {
    return { ok: false, status: 403, error: "Forbidden", details: { role: auth.context.role } };
  }
  return { ok: true, context: auth.context as AdminContext };
}

export function requireStateUser(
  context: AuthContext | null | undefined
): { ok: true; context: StateUserContext } | { ok: false; status: number; error: string; details?: unknown } {
  const auth = requireAuth(context);
  if (!auth.ok) return auth;
  if (auth.context.role !== "state_user") {
    return { ok: false, status: 403, error: "Forbidden", details: { role: auth.context.role } };
  }
  if (!auth.context.user.stateId) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      details: { message: "State user is missing required state assignment" }
    };
  }
  return { ok: true, context: auth.context as StateUserContext };
}

export async function withAdmin(request: Request) {
  const auth = await withAuth(request, "admin");
  if (!auth.ok) return auth;
  const guard = requireAdmin(auth.context);
  if (!guard.ok) {
    return {
      ok: false as const,
      response: Response.json(
        {
          error: guard.error,
          details: guard.details
        },
        { status: guard.status }
      )
    };
  }
  return {
    ok: true as const,
    context: guard.context
  };
}

export async function withStateUser(request: Request) {
  const auth = await withAuth(request, "state_user");
  if (!auth.ok) return auth;
  const guard = requireStateUser(auth.context);
  if (!guard.ok) {
    return {
      ok: false as const,
      response: Response.json(
        {
          error: guard.error,
          details: guard.details
        },
        { status: guard.status }
      )
    };
  }
  return {
    ok: true as const,
    context: guard.context
  };
}
