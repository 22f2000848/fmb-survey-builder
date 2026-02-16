import { ok } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  return ok({ status: "ok", message: "CG Dump Server API is running" });
}
