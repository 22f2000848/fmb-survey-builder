import { z } from "zod";
export * from "./fmb";

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional()
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const UserRoleSchema = z.enum(["admin", "state_user"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const CreateStateSchema = z.object({
  code: z.string().min(2).max(12).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(120)
});
export type CreateStateInput = z.infer<typeof CreateStateSchema>;

export const CreateStateUserSchema = z.object({
  cognitoSub: z.string().min(3),
  email: z.string().email().optional(),
  fullName: z.string().min(2).max(120).optional(),
  stateCode: z.string().min(2).max(12).regex(/^[A-Z0-9_]+$/)
});
export type CreateStateUserInput = z.infer<typeof CreateStateUserSchema>;

export const SetStateProductSchema = z.object({
  stateCode: z.string().min(2).max(12).regex(/^[A-Z0-9_]+$/),
  productCode: z.string().min(2).max(24).regex(/^[A-Z0-9_]+$/),
  productName: z.string().min(2).max(120).optional(),
  isEnabled: z.boolean()
});
export type SetStateProductInput = z.infer<typeof SetStateProductSchema>;

export const CreateProductSchema = z.object({
  code: z.string().min(2).max(24).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(120)
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const CreateDatasetSchema = z.object({
  name: z.string().min(2).max(180),
  productCode: z.string().min(2).max(24).regex(/^[A-Z0-9_]+$/),
  templateCode: z.string().min(2).max(64).regex(/^[A-Z0-9_]+$/),
  stateCode: z.string().min(2).max(12).regex(/^[A-Z0-9_]+$/).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});
export type CreateDatasetInput = z.infer<typeof CreateDatasetSchema>;

export const DatasetRowInputSchema = z.object({
  rowIndex: z.number().int().nonnegative(),
  data: z.record(z.string(), z.unknown())
});
export type DatasetRowInput = z.infer<typeof DatasetRowInputSchema>;

export const UpdateDatasetRowsSchema = z.object({
  version: z.number().int().positive(),
  rows: z.array(DatasetRowInputSchema).max(10000)
});
export type UpdateDatasetRowsInput = z.infer<typeof UpdateDatasetRowsSchema>;

export const CreateTemplateSchema = z.object({
  productCode: z.string().min(2).max(24).regex(/^[A-Z0-9_]+$/),
  code: z.string().min(2).max(64).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(120),
  schema: z.record(z.string(), z.unknown())
});
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;

export const DraftSelectorSchema = z.object({
  productCode: z.string().min(2).max(24).regex(/^[A-Z0-9_]+$/),
  stateCode: z.string().min(2).max(12).regex(/^[A-Z0-9_]+$/).optional()
});
export type DraftSelectorInput = z.infer<typeof DraftSelectorSchema>;

export const CreateDraftSchema = DraftSelectorSchema.extend({
  templateCode: z.string().min(2).max(64).regex(/^[A-Z0-9_]+$/).optional(),
  name: z.string().min(2).max(180).optional()
});
export type CreateDraftInput = z.infer<typeof CreateDraftSchema>;

export const CreateDraftForStateUserSchema = z
  .object({
    productCode: z.string().min(2).max(24).regex(/^[A-Z0-9_]+$/)
  })
  .strict();
export type CreateDraftForStateUserInput = z.infer<typeof CreateDraftForStateUserSchema>;

export const UpdateDraftRowsSchema = DraftSelectorSchema.extend({
  version: z.number().int().positive().optional(),
  rows: z.array(DatasetRowInputSchema).max(10000)
});
export type UpdateDraftRowsInput = z.infer<typeof UpdateDraftRowsSchema>;

export const PublishDraftSchema = DraftSelectorSchema;
export type PublishDraftInput = z.infer<typeof PublishDraftSchema>;

export const DraftSelectorForStateUserSchema = z
  .object({
    productCode: z.string().min(2).max(24).regex(/^[A-Z0-9_]+$/)
  })
  .strict();
export type DraftSelectorForStateUserInput = z.infer<typeof DraftSelectorForStateUserSchema>;

export const UpdateDraftRowsForStateUserSchema = z
  .object({
    productCode: z.string().min(2).max(24).regex(/^[A-Z0-9_]+$/),
    rows: z.array(DatasetRowInputSchema)
  })
  .strict();
export type UpdateDraftRowsForStateUserInput = z.infer<typeof UpdateDraftRowsForStateUserSchema>;
