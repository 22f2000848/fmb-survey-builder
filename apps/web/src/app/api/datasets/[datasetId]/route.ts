import { getDataset } from "@cg-dump/core";

import { withAuth } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { ok } from "@/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ datasetId: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  try {
    const { datasetId } = await params;
    const dataset = await getDataset(auth.context, datasetId);
    return ok({
      id: dataset.id,
      name: dataset.name,
      version: dataset.version,
      metadata: dataset.metadata,
      state: {
        id: dataset.state.id,
        code: dataset.state.code,
        name: dataset.state.name
      },
      product: {
        id: dataset.product.id,
        code: dataset.product.code,
        name: dataset.product.name
      },
      template: {
        id: dataset.template.id,
        code: dataset.template.code,
        name: dataset.template.name,
        schema: dataset.template.schema
      },
      rows: dataset.rows.map((row) => ({
        id: row.id,
        rowIndex: row.rowIndex,
        data: row.data
      })),
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt
    });
  } catch (error) {
    return handleDomainError(error, "Failed to fetch dataset");
  }
}
