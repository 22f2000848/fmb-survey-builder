import { listEnabledProductsForState } from "@cg-dump/core";

import { withStateUser } from "@/server/auth";
import { ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withErrorBoundary(async () => {
    const auth = await withStateUser(request);
    if (!auth.ok) return auth.response;

    const rows = await listEnabledProductsForState(auth.context.user.stateId);
    return ok(
      rows.map((row) => ({
        stateId: row.stateId,
        productId: row.productId,
        isEnabled: row.isEnabled,
        product: {
          code: row.product.code,
          name: row.product.name,
          description: row.product.description
        }
      }))
    );
  }, "Failed to list enabled products");
}
