import { updateDatasetRows } from "@cg-dump/core";
import { UpdateDatasetRowsSchema } from "@cg-dump/shared";

import { withAuth } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { err, ok } from "@/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ datasetId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  try {
    const { datasetId } = await params;
    const body = await request.json();
    const parsed = UpdateDatasetRowsSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const dataset = await updateDatasetRows(auth.context, datasetId, parsed.data);
    return ok({
      id: dataset.id,
      version: dataset.version,
      rows: dataset.rows.map((row) => ({
        id: row.id,
        rowIndex: row.rowIndex,
        data: row.data
      })),
      updatedAt: dataset.updatedAt
    });
  } catch (error) {
    return handleDomainError(error, "Failed to update dataset rows");
  }
}
