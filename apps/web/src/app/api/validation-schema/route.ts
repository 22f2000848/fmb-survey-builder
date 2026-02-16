import { validationEngine } from "@/server/legacy/modules";
import { ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  return withErrorBoundary(async () => ok(validationEngine.getValidationSchema()), "Failed to get validation schema");
}
