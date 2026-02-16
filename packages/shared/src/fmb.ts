import { z } from "zod";

export const TemplateColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "date"]).default("string"),
  required: z.boolean().default(false),
  maxLength: z.number().int().positive().optional(),
  options: z.array(z.string()).optional()
});

export const TemplateDefinitionSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  productCode: z.string().min(2),
  columns: z.array(TemplateColumnSchema).min(1)
});

export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;
export type TemplateColumn = z.infer<typeof TemplateColumnSchema>;

export const FMB_TEMPLATE_V1: TemplateDefinition = {
  code: "FMB_DUMP_V1",
  name: "FMB Dump Template",
  productCode: "FMB",
  columns: [
    { key: "surveyId", label: "Survey ID", type: "string", required: true, maxLength: 64 },
    { key: "surveyName", label: "Survey Name", type: "string", required: true, maxLength: 180 },
    { key: "state", label: "State", type: "string", required: true, maxLength: 64 },
    { key: "district", label: "District", type: "string", required: true, maxLength: 64 },
    { key: "block", label: "Block", type: "string", required: false, maxLength: 64 },
    { key: "village", label: "Village", type: "string", required: false, maxLength: 120 },
    { key: "recordDate", label: "Record Date", type: "date", required: false },
    { key: "submissionCount", label: "Submission Count", type: "number", required: false },
    { key: "isActive", label: "Is Active", type: "boolean", required: false }
  ]
};

export type RowValidationError = {
  rowIndex: number;
  field: string;
  message: string;
};

export function validateRowAgainstTemplate(
  rowIndex: number,
  data: Record<string, unknown>,
  template: TemplateDefinition
): RowValidationError[] {
  const errors: RowValidationError[] = [];
  template.columns.forEach((column) => {
    const value = data[column.key];

    if (column.required && (value === null || value === undefined || value === "")) {
      errors.push({
        rowIndex,
        field: column.key,
        message: `${column.label} is required`
      });
      return;
    }

    if (value === null || value === undefined || value === "") {
      return;
    }

    if (column.type === "number" && Number.isNaN(Number(value))) {
      errors.push({
        rowIndex,
        field: column.key,
        message: `${column.label} must be numeric`
      });
    }

    if (column.type === "boolean") {
      const normalized = String(value).toLowerCase();
      if (!["true", "false", "1", "0", "yes", "no"].includes(normalized)) {
        errors.push({
          rowIndex,
          field: column.key,
          message: `${column.label} must be a boolean`
        });
      }
    }

    if (column.maxLength && String(value).length > column.maxLength) {
      errors.push({
        rowIndex,
        field: column.key,
        message: `${column.label} must be <= ${column.maxLength} characters`
      });
    }
  });

  return errors;
}
