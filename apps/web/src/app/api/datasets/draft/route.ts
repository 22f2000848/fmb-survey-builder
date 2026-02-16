import { createOrGetDraftDataset, getDraftDataset } from "@cg-dump/core";
import { CreateDraftForStateUserSchema, DraftSelectorForStateUserSchema } from "@cg-dump/shared";

import { withStateUser } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { err, ok } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await withStateUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const productCode = searchParams.get("product") || searchParams.get("productCode");
    const parsed = DraftSelectorForStateUserSchema.safeParse({ productCode });
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const draft = await getDraftDataset(auth.context, parsed.data);
    return ok({
      id: draft.id,
      name: draft.name,
      version: draft.version,
      status: draft.status,
      state: {
        id: draft.state.id,
        code: draft.state.code,
        name: draft.state.name
      },
      product: {
        id: draft.product.id,
        code: draft.product.code,
        name: draft.product.name
      },
      template: {
        id: draft.template.id,
        code: draft.template.code,
        name: draft.template.name,
        schema: draft.template.schema
      },
      rows: draft.rows.map((row) => ({
        id: row.id,
        rowIndex: row.rowIndex,
        data: row.data
      })),
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt
    });
  } catch (error) {
    return handleDomainError(error, "Failed to fetch draft dataset");
  }
}

export async function POST(request: Request) {
  const auth = await withStateUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = CreateDraftForStateUserSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const result = await createOrGetDraftDataset(auth.context, parsed.data);
    return ok(
      {
        created: result.created,
        draft: {
          id: result.dataset.id,
          name: result.dataset.name,
          version: result.dataset.version,
          status: result.dataset.status,
          productCode: result.dataset.product.code,
          stateCode: result.dataset.state.code
        }
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    return handleDomainError(error, "Failed to create draft dataset");
  }
}
