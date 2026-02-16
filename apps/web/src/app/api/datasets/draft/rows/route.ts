import { overwriteDraftRows } from "@cg-dump/core";
import { UpdateDraftRowsSchema } from "@cg-dump/shared";

import { withAuth } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { err, ok } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const auth = await withAuth(request, ["admin", "state_user"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = UpdateDraftRowsSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const updated = await overwriteDraftRows(auth.context, parsed.data);
    return ok({
      draft: {
        id: updated.id,
        version: updated.version,
        updatedAt: updated.updatedAt
      },
      rows: updated.rows.map((row) => ({
        id: row.id,
        rowIndex: row.rowIndex,
        data: row.data
      }))
    });
  } catch (error) {
    return handleDomainError(error, "Failed to overwrite draft rows");
  }
}
