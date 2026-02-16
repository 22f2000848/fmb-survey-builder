import { createState } from "@cg-dump/core";
import { CreateStateSchema } from "@cg-dump/shared";

import { withAuth } from "@/server/auth";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withErrorBoundary(async () => {
    const auth = await withAuth(request, "admin");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = CreateStateSchema.safeParse(body);
    if (!parsed.success) {
      return err(400, "Invalid request", parsed.error.flatten());
    }

    const state = await createState(parsed.data);
    return ok(
      {
        id: state.id,
        code: state.code,
        name: state.name
      },
      { status: 201 }
    );
  }, "Failed to create state");
}
