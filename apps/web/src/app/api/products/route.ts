import { prisma } from "@cg-dump/db";

import { withAuth } from "@/server/auth";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withErrorBoundary(async () => {
    const auth = await withAuth(request, ["admin", "state_user"]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const stateCode = searchParams.get("stateCode")?.trim().toUpperCase() || null;

    if (auth.context.role === "state_user") {
      const stateId = auth.context.user.stateId;
      if (!stateId) {
        return err(403, "Forbidden", { message: "State user is missing required state assignment" });
      }

      const rows = await prisma.stateProduct.findMany({
        where: {
          stateId,
          isEnabled: true,
          product: {
            isActive: true
          }
        },
        include: {
          product: true
        },
        orderBy: {
          product: {
            code: "asc"
          }
        }
      });

      return ok(
        rows.map((row) => ({
          id: row.product.id,
          code: row.product.code,
          name: row.product.name,
          description: row.product.description,
          isActive: row.product.isActive,
          isEnabled: row.isEnabled
        }))
      );
    }

    let scopedStateId: string | null = null;
    if (stateCode) {
      const state = await prisma.state.findUnique({
        where: {
          code: stateCode
        }
      });
      if (!state) {
        return err(404, "State not found", { stateCode });
      }
      scopedStateId = state.id;
    }

    if (!scopedStateId) {
      const products = await prisma.product.findMany({
        orderBy: {
          code: "asc"
        }
      });
      return ok(
        products.map((product) => ({
          id: product.id,
          code: product.code,
          name: product.name,
          description: product.description,
          isActive: product.isActive
        }))
      );
    }

    const products = await prisma.product.findMany({
      include: {
        stateProducts: {
          where: {
            stateId: scopedStateId
          },
          select: {
            isEnabled: true
          },
          take: 1
        }
      },
      orderBy: {
        code: "asc"
      }
    });

    return ok(
      products.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description,
        isActive: product.isActive,
        isEnabled: product.stateProducts[0]?.isEnabled ?? false
      }))
    );
  }, "Failed to list products");
}
