import { prisma } from "@cg-dump/db";

import { withAuth } from "@/server/auth";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withErrorBoundary(async () => {
    const auth = await withAuth(request, ["admin", "state_user"]);
    if (!auth.ok) return auth.response;

    let state: { code: string; name: string } | null = null;
    if (auth.context.user.stateId) {
      const stateRecord = await prisma.state.findUnique({
        where: { id: auth.context.user.stateId },
        select: { code: true, name: true }
      });
      if (!stateRecord && auth.context.role === "state_user") {
        return err(403, "Forbidden", { message: "User state assignment is invalid" });
      }
      state = stateRecord;
    }

    return ok({
      userId: auth.context.user.id,
      role: auth.context.role,
      state
    });
  }, "Failed to load current user");
}
