import { prisma } from "@cg-dump/db";
import { listEnabledProductsForState } from "@cg-dump/core";

import { withAuth } from "@/server/auth";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

async function resolveStateIdForProducts(role: "admin" | "state_user", stateId: string, stateCode?: string | null) {
  if (role === "state_user") {
    return stateId;
  }

  if (!stateCode) {
    throw new Error("stateCode query parameter is required for admin");
  }

  const state = await prisma.state.findUnique({
    where: {
      code: stateCode.trim().toUpperCase()
    }
  });

  if (!state) {
    throw new Error(`State "${stateCode}" not found`);
  }

  return state.id;
}

export async function GET(request: Request) {
  return withErrorBoundary(async () => {
    const auth = await withAuth(request, ["admin", "state_user"]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const stateCode = searchParams.get("stateCode");

    let scopedStateId: string;
    try {
      scopedStateId = await resolveStateIdForProducts(auth.context.role, auth.context.user.stateId, stateCode);
    } catch (error) {
      return err(400, "Invalid request", {
        message: error instanceof Error ? error.message : String(error)
      });
    }

    const rows = await listEnabledProductsForState(scopedStateId);
    return ok(
      rows.map((row) => ({
        stateId: row.stateId,
        productId: row.productId,
        enabled: row.enabled,
        product: {
          id: row.product.id,
          code: row.product.code,
          name: row.product.name,
          description: row.product.description
        }
      }))
    );
  }, "Failed to list products");
}
