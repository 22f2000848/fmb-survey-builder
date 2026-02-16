import { z } from "zod";

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
  enabled: z.boolean()
});
export type SetStateProductInput = z.infer<typeof SetStateProductSchema>;
