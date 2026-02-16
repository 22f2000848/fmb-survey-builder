import { listEnabledProductsForState } from "@cg-dump/core";

import { withAuth } from "@/server/auth";
import { ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withErrorBoundary(async () => {
    const auth = await withAuth(request, ["admin", "state_user"]);
    if (!auth.ok) return auth.response;

    if (auth.context.role === "admin") {
      return ok([]);
    }

    const rows = await listEnabledProductsForState(auth.context.user.stateId as string);
    return ok(
      rows.map((row) => ({
        stateId: row.stateId,
        productId: row.productId,
        enabled: row.enabled,
        product: {
          code: row.product.code,
          name: row.product.name,
          description: row.product.description
        }
      }))
    );
  }, "Failed to list enabled products");
}
