import { createDataset, listDatasets } from "@cg-dump/core";
import { CreateDatasetSchema } from "@cg-dump/shared";

import { withAuth } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { err, ok } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const datasets = await listDatasets(auth.context, {
      productCode: searchParams.get("productCode") || undefined,
      templateCode: searchParams.get("templateCode") || undefined,
      stateCode: searchParams.get("stateCode") || undefined
    });

    return ok(
      datasets.map((dataset) => ({
        id: dataset.id,
        name: dataset.name,
        version: dataset.version,
        createdAt: dataset.createdAt,
        updatedAt: dataset.updatedAt,
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
          name: dataset.template.name
        }
      }))
    );
  } catch (error) {
    return handleDomainError(error, "Failed to list datasets");
  }
}

export async function POST(request: Request) {
  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = CreateDatasetSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const dataset = await createDataset(auth.context, parsed.data);
    return ok(
      {
        id: dataset.id,
        name: dataset.name,
        version: dataset.version,
        stateId: dataset.stateId,
        productId: dataset.productId,
        templateId: dataset.templateId
      },
      { status: 201 }
    );
  } catch (error) {
    return handleDomainError(error, "Failed to create dataset");
  }
}
