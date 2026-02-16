import { overwriteDraftRows } from "@cg-dump/core";
import { UpdateDraftRowsForStateUserSchema } from "@cg-dump/shared";

import { withStateUser } from "@/server/auth";
import { handleDomainError } from "@/server/domain";
import { err, ok } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const auth = await withStateUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = UpdateDraftRowsForStateUserSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }
    if (parsed.data.rows.length > 10000) {
      return err(400, "Invalid request", { message: "rows exceeds maximum limit of 10000" });
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
