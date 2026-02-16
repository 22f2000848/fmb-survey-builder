import { publishDraftDataset } from "@cg-dump/core";
import { DraftSelectorForStateUserSchema } from "@cg-dump/shared";

import { withStateUser } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { err, ok } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await withStateUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = DraftSelectorForStateUserSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const published = await publishDraftDataset(auth.context, parsed.data);
    return ok(
      {
        published: {
          id: published.id,
          name: published.name,
          status: published.status,
          versionNumber: published.versionNumber,
          stateCode: published.state.code,
          productCode: published.product.code,
          createdAt: published.createdAt
        },
        rowsCount: published.rows.length
      },
      { status: 201 }
    );
  } catch (error) {
    return handleDomainError(error, "Failed to publish draft dataset");
  }
}
