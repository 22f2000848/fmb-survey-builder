import { createProduct } from "@cg-dump/core";
import { CreateProductSchema } from "@cg-dump/shared";

import { withAdmin } from "@/server/auth";
import { err, ok, withErrorBoundary } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withErrorBoundary(async () => {
    const limited = rateLimit(request, "admin:products", 30);
    if (limited) return limited;

    const auth = await withAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const product = await createProduct(parsed.data);
    return ok(
      {
        id: product.id,
        code: product.code,
        name: product.name,
        isActive: product.isActive
      },
      { status: 201 }
    );
  }, "Failed to create product");
}
