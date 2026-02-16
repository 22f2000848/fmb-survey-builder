import { prisma } from "@cg-dump/db";
import type { AuthContext } from "./auth";
import { DomainError } from "./errors";
import type {
  CreateDatasetInput,
  CreateDraftInput,
  DraftSelectorInput,
  PublishDraftInput,
  UpdateDatasetRowsInput,
  UpdateDraftRowsInput
} from "@cg-dump/shared";
import { TemplateDefinitionSchema, validateRowAgainstTemplate } from "@cg-dump/shared";

type DatasetFilters = {
  productCode?: string;
  templateCode?: string;
  stateCode?: string;
};

function isAdmin(context: AuthContext) {
  return context.role === "admin";
}

function assertStateAccess(context: AuthContext, stateId: string) {
  if (!isAdmin(context) && context.user.stateId !== stateId) {
    throw new DomainError(403, "Forbidden", { message: "State users can only access their own state data" });
  }
}

function scopedDatasetWhere(context: AuthContext, datasetId: string) {
  if (isAdmin(context)) {
    return { id: datasetId };
  }
  return {
    id: datasetId,
    stateId: context.user.stateId
  };
}

async function assertProductEnabledForState(stateId: string, productId: string) {
  const enabled = await prisma.stateProduct.findFirst({
    where: {
      stateId,
      productId,
      enabled: true,
      product: {
        isGloballyOn: true
      }
    }
  });
  if (!enabled) {
    throw new DomainError(403, "Product is not enabled for this state", { stateId, productId });
  }
}

async function resolveStateScope(context: AuthContext, stateCode?: string) {
  if (!isAdmin(context)) {
    return context.user.stateId;
  }
  if (!stateCode) {
    throw new DomainError(400, "stateCode is required for admin requests");
  }
  const state = await prisma.state.findUnique({
    where: {
      code: stateCode.trim().toUpperCase()
    }
  });
  if (!state) {
    throw new DomainError(404, "State not found", { stateCode });
  }
  return state.id;
}

async function resolveProductByCode(productCode: string) {
  const code = productCode.trim().toUpperCase();
  const product = await prisma.product.findUnique({
    where: { code }
  });
  if (!product) {
    throw new DomainError(404, "Product not found", { productCode: code });
  }
  return product;
}

async function findActiveDraft(stateId: string, productId: string) {
  return prisma.dataset.findFirst({
    where: {
      stateId,
      productId,
      lifecycle: "DRAFT",
      isActiveDraft: true
    },
    include: {
      rows: {
        orderBy: { rowIndex: "asc" }
      },
      product: true,
      template: true,
      state: true
    }
  });
}

export async function createDataset(context: AuthContext, input: CreateDatasetInput) {
  const productCode = input.productCode.trim().toUpperCase();
  const templateCode = input.templateCode.trim().toUpperCase();
  const stateCode = input.stateCode?.trim().toUpperCase();

  const product = await prisma.product.findUnique({
    where: { code: productCode }
  });
  if (!product) {
    throw new DomainError(404, "Product not found", { productCode });
  }

  const template = await prisma.template.findFirst({
    where: {
      productId: product.id,
      code: templateCode,
      isActive: true
    }
  });
  if (!template) {
    throw new DomainError(404, "Template not found", { productCode, templateCode });
  }

  let stateId: string;
  if (isAdmin(context)) {
    if (!stateCode) {
      throw new DomainError(400, "stateCode is required for admin dataset creation");
    }
    const state = await prisma.state.findUnique({ where: { code: stateCode } });
    if (!state) {
      throw new DomainError(404, "State not found", { stateCode });
    }
    stateId = state.id;
  } else {
    stateId = context.user.stateId;
  }

  await assertProductEnabledForState(stateId, product.id);

  const dataset = await prisma.dataset.create({
    data: {
      name: input.name.trim(),
      productId: product.id,
      templateId: template.id,
      stateId,
      createdByUserId: context.user.id,
      metadata: (input.metadata as any) ?? undefined
    },
    include: {
      product: true,
      template: true,
      state: true
    }
  });

  return dataset;
}

export async function listDatasets(context: AuthContext, filters: DatasetFilters) {
  const where: Record<string, unknown> = {};
  if (!isAdmin(context)) {
    where.stateId = context.user.stateId;
    where.product = {
      stateProducts: {
        some: {
          stateId: context.user.stateId,
          enabled: true
        }
      }
    };
  } else if (filters.stateCode) {
    const state = await prisma.state.findUnique({ where: { code: filters.stateCode.trim().toUpperCase() } });
    if (!state) {
      throw new DomainError(404, "State not found", { stateCode: filters.stateCode });
    }
    where.stateId = state.id;
  }

  if (filters.productCode) {
    const product = await prisma.product.findUnique({ where: { code: filters.productCode.trim().toUpperCase() } });
    if (!product) {
      return [];
    }
    if (!isAdmin(context)) {
      await assertProductEnabledForState(context.user.stateId, product.id);
    }
    where.productId = product.id;
  }

  if (filters.templateCode) {
    where.template = {
      code: filters.templateCode.trim().toUpperCase()
    };
  }

  return prisma.dataset.findMany({
    where,
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      product: true,
      template: true,
      state: true
    }
  });
}

export async function getDataset(context: AuthContext, datasetId: string) {
  const dataset = await prisma.dataset.findFirst({
    where: scopedDatasetWhere(context, datasetId),
    include: {
      rows: {
        orderBy: { rowIndex: "asc" }
      },
      product: true,
      template: true,
      state: true
    }
  });
  if (!dataset) {
    throw new DomainError(404, "Dataset not found");
  }
  assertStateAccess(context, dataset.stateId);
  if (!isAdmin(context)) {
    await assertProductEnabledForState(dataset.stateId, dataset.productId);
  }
  return dataset;
}

export async function updateDatasetRows(context: AuthContext, datasetId: string, input: UpdateDatasetRowsInput) {
  const dataset = await prisma.dataset.findFirst({
    where: scopedDatasetWhere(context, datasetId),
    include: {
      rows: true,
      template: true
    }
  });
  if (!dataset) {
    throw new DomainError(404, "Dataset not found");
  }
  assertStateAccess(context, dataset.stateId);
  if (!isAdmin(context)) {
    await assertProductEnabledForState(dataset.stateId, dataset.productId);
  }

  if (dataset.version !== input.version) {
    throw new DomainError(409, "Dataset version mismatch", {
      expectedVersion: dataset.version,
      providedVersion: input.version
    });
  }

  const parsedTemplate = TemplateDefinitionSchema.safeParse(dataset.template.schema);
  if (!parsedTemplate.success) {
    throw new DomainError(500, "Dataset template schema is invalid");
  }

  const rowValidationErrors = input.rows.flatMap((row) =>
    validateRowAgainstTemplate(row.rowIndex, row.data, parsedTemplate.data)
  );
  if (rowValidationErrors.length > 0) {
    throw new DomainError(400, "Row validation failed", {
      errors: rowValidationErrors
    });
  }

  const rows = input.rows.map((row) => ({
    datasetId: dataset.id,
    rowIndex: row.rowIndex,
    data: row.data as any
  }));

  const updated = await prisma.$transaction(async (tx) => {
    await tx.datasetRow.deleteMany({
      where: { datasetId: dataset.id }
    });

    if (rows.length > 0) {
      await tx.datasetRow.createMany({
        data: rows
      });
    }

    return tx.dataset.update({
      where: { id: dataset.id },
      data: {
        version: {
          increment: 1
        }
      },
      include: {
        rows: {
          orderBy: { rowIndex: "asc" }
        },
        product: true,
        template: true,
        state: true
      }
    });
  });

  return updated;
}

export async function createOrGetDraftDataset(context: AuthContext, input: CreateDraftInput) {
  const stateId = await resolveStateScope(context, input.stateCode);
  const product = await resolveProductByCode(input.productCode);
  await assertProductEnabledForState(stateId, product.id);

  const existing = await findActiveDraft(stateId, product.id);
  if (existing) {
    return { dataset: existing, created: false };
  }

  let template = null;
  if (input.templateCode) {
    template = await prisma.template.findFirst({
      where: {
        productId: product.id,
        code: input.templateCode.trim().toUpperCase(),
        isActive: true
      }
    });
  } else {
    template = await prisma.template.findFirst({
      where: {
        productId: product.id,
        isActive: true
      },
      orderBy: {
        code: "asc"
      }
    });
  }

  if (!template) {
    throw new DomainError(404, "Active template not found for product", { productCode: product.code });
  }

  try {
    const created = await prisma.dataset.create({
      data: {
        name: input.name?.trim() || `${product.code} Draft`,
        productId: product.id,
        templateId: template.id,
        stateId,
        createdByUserId: context.user.id,
        lifecycle: "DRAFT",
        isActiveDraft: true,
        publishedVersion: null,
        version: 1
      },
      include: {
        rows: {
          orderBy: { rowIndex: "asc" }
        },
        product: true,
        template: true,
        state: true
      }
    });
    return { dataset: created, created: true };
  } catch {
    const concurrent = await findActiveDraft(stateId, product.id);
    if (concurrent) {
      return { dataset: concurrent, created: false };
    }
    throw new DomainError(500, "Failed to create draft dataset");
  }
}

export async function getDraftDataset(context: AuthContext, input: DraftSelectorInput) {
  const stateId = await resolveStateScope(context, input.stateCode);
  const product = await resolveProductByCode(input.productCode);
  await assertProductEnabledForState(stateId, product.id);

  const draft = await findActiveDraft(stateId, product.id);
  if (!draft) {
    throw new DomainError(404, "Draft dataset not found", {
      productCode: product.code
    });
  }
  return draft;
}

export async function overwriteDraftRows(context: AuthContext, input: UpdateDraftRowsInput) {
  const draft = await getDraftDataset(context, {
    productCode: input.productCode,
    stateCode: input.stateCode
  });

  return updateDatasetRows(context, draft.id, {
    version: input.version,
    rows: input.rows
  });
}

export async function publishDraftDataset(context: AuthContext, input: PublishDraftInput) {
  const draft = await getDraftDataset(context, input);

  const parsedTemplate = TemplateDefinitionSchema.safeParse(draft.template.schema);
  if (!parsedTemplate.success) {
    throw new DomainError(500, "Dataset template schema is invalid");
  }

  const rowValidationErrors = draft.rows.flatMap((row) =>
    validateRowAgainstTemplate(row.rowIndex, row.data as Record<string, unknown>, parsedTemplate.data)
  );
  if (rowValidationErrors.length > 0) {
    throw new DomainError(400, "Row validation failed", {
      errors: rowValidationErrors
    });
  }

  const aggregate = await prisma.dataset.aggregate({
    where: {
      stateId: draft.stateId,
      productId: draft.productId,
      lifecycle: "PUBLISHED"
    },
    _max: {
      publishedVersion: true
    }
  });
  const nextPublishedVersion = (aggregate._max.publishedVersion || 0) + 1;

  const published = await prisma.$transaction(async (tx) => {
    const created = await tx.dataset.create({
      data: {
        name: draft.name,
        productId: draft.productId,
        templateId: draft.templateId,
        stateId: draft.stateId,
        createdByUserId: context.user.id,
        lifecycle: "PUBLISHED",
        isActiveDraft: false,
        publishedVersion: nextPublishedVersion,
        metadata: draft.metadata as any,
        version: 1
      },
      include: {
        product: true,
        template: true,
        state: true
      }
    });

    if (draft.rows.length > 0) {
      await tx.datasetRow.createMany({
        data: draft.rows.map((row) => ({
          datasetId: created.id,
          rowIndex: row.rowIndex,
          data: row.data as any
        }))
      });
    }

    return tx.dataset.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        rows: {
          orderBy: { rowIndex: "asc" }
        },
        product: true,
        template: true,
        state: true
      }
    });
  });

  return published;
}
