import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import path from "node:path";

import { validationEngine } from "@/server/legacy/modules";
import { config } from "@/server/config";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

const SUPPORTED_SCHEMAS = ["survey", "question", "both"] as const;
const SURVEY_SCHEMA_HEADERS = new Set([
  "surveyid",
  "surveyname",
  "surveydescription",
  "availablemediums",
  "public",
  "inschool",
  "acceptmultipleentries",
  "launchdate",
  "closedate"
]);
const QUESTION_SCHEMA_HEADERS = new Set([
  "questionid",
  "questiontype",
  "questiondescription",
  "medium",
  "ismandatory",
  "sourcequestion",
  "tableheadervalue",
  "tablequestionvalue",
  "options"
]);

type SupportedSchema = (typeof SUPPORTED_SCHEMAS)[number];

export async function POST(request: Request) {
  return withErrorBoundary(async () => {
    const { searchParams } = new URL(request.url);
    const schema = (searchParams.get("schema") || "both") as SupportedSchema;
    if (!SUPPORTED_SCHEMAS.includes(schema)) {
      return err(400, "Invalid schema query parameter", {
        message: "schema must be one of: survey, question, both",
        details: [{ field: "schema", value: schema }],
        errors: ["schema must be one of: survey, question, both"]
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return err(400, "No file uploaded");
    }

    if (file.size > config.MAX_UPLOAD_BYTES) {
      return err(400, "File too large", {
        maxBytes: config.MAX_UPLOAD_BYTES
      });
    }

    const fileExt = path.extname(file.name).toLowerCase();
    if (![".csv", ".xlsx", ".xls"].includes(fileExt)) {
      return err(400, "Only CSV and Excel files are allowed");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let surveyData: Record<string, unknown>[] = [];
    let questionData: Record<string, unknown>[] = [];

    if (fileExt === ".csv") {
      const csvContent = new TextDecoder().decode(bytes);
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      if (records.length > 0) {
        const detectedSchema = detectCsvSchema(records, schema);
        if (!detectedSchema) {
          return err(400, "Unable to detect CSV schema", {
            message:
              "CSV headers do not match Survey Master or Question Master. Use ?schema=survey or ?schema=question to force schema selection.",
            details: [{ schema, headers: Object.keys(records[0] || {}) }],
            errors: ["CSV schema detection failed"]
          });
        }

        if (detectedSchema === "survey") {
          surveyData = records.map((record: Record<string, unknown>, index: number) => {
            const normalized = normalizeKeys(record);
            normalized._excelRow = index + 2;
            normalized._sheetName = "CSV";
            return normalized;
          });
        } else {
          questionData = records.map((record: Record<string, unknown>, index: number) => {
            const normalized = normalizeKeys(record);
            normalized._excelRow = index + 2;
            normalized._sheetName = "CSV";
            return normalized;
          });
        }
      }
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(bytes as any);

      const surveySheet = workbook.worksheets.find(
        (ws) => ws.name.toLowerCase().replace(/\s+/g, "") === "surveymaster" || ws.name.toLowerCase().replace(/\s+/g, "") === "survey"
      );
      const questionSheet = workbook.worksheets.find(
        (ws) =>
          ws.name.toLowerCase().replace(/\s+/g, "") === "questionmaster" || ws.name.toLowerCase().replace(/\s+/g, "") === "question"
      );

      if (surveySheet) {
        surveyData = parseExcelSheet(surveySheet, surveySheet.name);
      }
      if (questionSheet) {
        questionData = parseExcelSheet(questionSheet, questionSheet.name);
      }
    }

    let allErrors: Record<string, unknown>[] = [];
    let totalRows = 0;

    if ((schema === "survey" || schema === "both") && surveyData.length > 0) {
      totalRows += surveyData.length;
      const surveyErrors = validationEngine.validateBulkSurveys(surveyData);
      surveyErrors.forEach((error: Record<string, unknown>) => {
        const record = surveyData[Number(error.row) - 2];
        if (record?._excelRow) {
          error.row = record._excelRow;
        }
        if (record?._sheetName) {
          error.sheet = record._sheetName;
        }
        error.surveyId = record?.surveyId || "";
        error.surveyName = record?.surveyName || "";
      });
      allErrors = allErrors.concat(surveyErrors);
    }

    if ((schema === "question" || schema === "both") && questionData.length > 0) {
      totalRows += questionData.length;
      const questionErrors = validationEngine.validateBulkQuestions(questionData, surveyData);
      questionErrors.forEach((error: Record<string, unknown>) => {
        const record = questionData[Number(error.row) - 2];
        if (record?._excelRow) {
          error.row = record._excelRow;
        }
        if (record?._sheetName) {
          error.sheet = record._sheetName;
        }
        error.surveyId = record?.surveyId || "";
        error.questionId = record?.questionId || "";
        error.questionType = record?.questionType || "";
        error.medium = record?.medium || "";
      });
      allErrors = allErrors.concat(questionErrors);
    }

    const errorRows = new Set(allErrors.map((e) => e.row)).size;
    return ok({
      isValid: allErrors.length === 0,
      summary: {
        totalRows,
        errorRows,
        totalErrors: allErrors.length
      },
      errors: allErrors
    });
  }, "Failed to validate upload");
}

function parseExcelSheet(sheet: ExcelJS.Worksheet, sheetName: string) {
  const data: Record<string, string>[] = [];
  const headers: string[] = [];
  const firstRow = sheet.getRow(1);
  firstRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "");
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const record: Record<string, unknown> = {};
    let hasData = false;
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        record[header] = cell.value as string;
        if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
          hasData = true;
        }
      }
    });
    if (hasData) {
      const normalized = normalizeKeys(record);
      normalized._excelRow = rowNumber;
      normalized._sheetName = sheetName;
      data.push(normalized as Record<string, string>);
    }
  });

  return data;
}

function normalizeHeaderKey(header: unknown) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function countMatchingHeaders(headers: string[], expectedHeaders: Set<string>) {
  return headers.reduce((count, header) => (expectedHeaders.has(header) ? count + 1 : count), 0);
}

function detectCsvSchema(records: Record<string, unknown>[], requestedSchema: SupportedSchema) {
  if (requestedSchema === "survey" || requestedSchema === "question") {
    return requestedSchema;
  }
  if (!records || records.length === 0) {
    return null;
  }
  const normalizedHeaders = Object.keys(records[0]).map(normalizeHeaderKey);
  const surveyMatches = countMatchingHeaders(normalizedHeaders, SURVEY_SCHEMA_HEADERS);
  const questionMatches = countMatchingHeaders(normalizedHeaders, QUESTION_SCHEMA_HEADERS);
  const hasSurveyId = normalizedHeaders.includes("surveyid");
  const hasQuestionId = normalizedHeaders.includes("questionid");

  if (surveyMatches >= 2 && questionMatches < 2) {
    return "survey";
  }
  if (questionMatches >= 2 && surveyMatches < 2) {
    return "question";
  }
  if (hasQuestionId && !hasSurveyId) {
    return "question";
  }
  if (hasSurveyId && !hasQuestionId) {
    return "survey";
  }
  return null;
}

function normalizeKeys(record: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};
  const keyMap: Record<string, string> = {
    "Survey ID": "surveyId",
    "Survey Name": "surveyName",
    "Survey Description": "surveyDescription",
    available_mediums: "availableMediums",
    "Available Mediums": "availableMediums",
    "Hierarchial Access Level": "hierarchicalAccessLevel",
    "Hierarchical Access Level": "hierarchicalAccessLevel",
    Public: "public",
    "In School": "inSchool",
    "Accept multiple Entries": "acceptMultipleEntries",
    "Accept Multiple Entries": "acceptMultipleEntries",
    "Launch Date": "launchDate",
    "Close Date": "closeDate",
    Mode: "mode",
    visible_on_report_bot: "visibleOnReportBot",
    "Visible on Report Bot": "visibleOnReportBot",
    "Is Active?": "isActive",
    "Is Active": "isActive",
    Download_response: "downloadResponse",
    "Download Response": "downloadResponse",
    "Geo Fencing": "geoFencing",
    "Geo Tagging": "geoTagging",
    "Test Survey": "testSurvey",
    "Question ID": "questionId",
    Medium: "medium",
    "Question Type": "questionType",
    "Question Description": "questionDescription",
    Text_input_type: "textInputType",
    "Text Input Type": "textInputType",
    "Is Mandatory": "isMandatory",
    Is_Mandatory: "isMandatory",
    Options: "options",
    Source_Question: "sourceQuestion",
    "Source Question": "sourceQuestion",
    Table_Header_value: "tableHeaderValue",
    "Table Header Value": "tableHeaderValue",
    Table_Question_value: "tableQuestionValue",
    "Table Question Value": "tableQuestionValue",
    Question_Media_Type: "questionMediaType",
    "Question Media Type": "questionMediaType",
    Question_Media_Link: "questionMediaLink",
    "Question Media Link": "questionMediaLink"
  };

  Object.entries(record).forEach(([key, value]) => {
    const normalizedKey = keyMap[key] || key;
    if (normalizedKey === "options" && typeof value === "string") {
      normalized[normalizedKey] = value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return;
    }
    if (normalizedKey === "availableMediums" && typeof value === "string") {
      normalized[normalizedKey] = value;
      return;
    }
    normalized[normalizedKey] = value !== null && value !== undefined ? String(value).trim() : "";
  });
  return normalized;
}
