import { z } from "zod";

import { setStateProductEnablement } from "@cg-dump/core";

import { withAdmin } from "@/server/auth";
import { err, ok, withErrorBoundary } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const BodySchema = z
  .object({
    isEnabled: z.boolean()
  })
  .strict();

type Params = {
  params: Promise<{
    stateCode: string;
    productCode: string;
  }>;
};

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const limited = rateLimit(request, "admin:state-products:path", 40);
    if (limited) return limited;

    const auth = await withAdmin(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const { stateCode, productCode } = await params;
    const record = await setStateProductEnablement({
      stateCode: stateCode.trim().toUpperCase(),
      productCode: productCode.trim().toUpperCase(),
      isEnabled: parsed.data.isEnabled
    });

    return ok({
      state: {
        id: record.state.id,
        code: record.state.code,
        name: record.state.name
      },
      product: {
        id: record.product.id,
        code: record.product.code,
        name: record.product.name
      },
      isEnabled: record.isEnabled
    });
  }, "Failed to update state product enablement");
}
