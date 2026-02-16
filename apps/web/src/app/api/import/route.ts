import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import path from "node:path";

import { readStore, writeStore } from "@/server/legacy/data/store";
import { validator } from "@/server/legacy/modules";
import { config } from "@/server/config";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

type ImportResult = {
  surveys: Record<string, unknown>[];
  questions: Record<string, unknown>[];
};

export async function POST(request: Request) {
  return withErrorBoundary(async () => {
    const { searchParams } = new URL(request.url);
    const overwrite = String(searchParams.get("overwrite") || "").toLowerCase() === "true";
    const sheetType = searchParams.get("sheetType") || "both";

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return err(400, "No file uploaded");
    }
    if (file.size > config.MAX_UPLOAD_BYTES) {
      return err(400, "File too large", { maxBytes: config.MAX_UPLOAD_BYTES });
    }

    const fileExt = path.extname(file.name).toLowerCase();
    const bytes = new Uint8Array(await file.arrayBuffer());

    let importData: ImportResult = { surveys: [], questions: [] };

    if (fileExt === ".xlsx" || fileExt === ".xls") {
      importData = await parseXLSX(bytes);
      if (importData.surveys.length === 0 || importData.questions.length === 0) {
        return err(400, "Survey Master and Question Master sheets are required for Excel imports.", {
          hasSurveyMaster: importData.surveys.length > 0,
          hasQuestionMaster: importData.questions.length > 0
        });
      }
    } else if (fileExt === ".csv") {
      importData = parseCSV(new TextDecoder().decode(bytes), sheetType);
      if (importData.surveys.length === 0 && importData.questions.length === 0) {
        return err(400, "Could not detect CSV type. Please upload a Survey Master or Question Master CSV.");
      }
    } else {
      return err(400, "Unsupported file format. Please upload XLSX or CSV file.");
    }

    const store = await readStore();
    const incomingSurveyIds = new Set(importData.surveys.map((survey) => String(survey.surveyId)));
    const duplicateSurveyIds = store.surveys
      .filter((survey: { surveyId: string }) => incomingSurveyIds.has(survey.surveyId))
      .map((survey: { surveyId: string }) => survey.surveyId);

    if (duplicateSurveyIds.length > 0 && !overwrite) {
      return err(400, "Duplicate survey IDs found", {
        message:
          "Import rejected because one or more Survey IDs already exist. Retry with overwrite=true to replace existing surveys.",
        details: [{ field: "surveyId", duplicates: [...new Set(duplicateSurveyIds)] }],
        validationErrors: duplicateSurveyIds.map((surveyId: string) => ({
          type: "survey",
          surveyId,
          errors: ["Survey ID already exists in the system"]
        })),
        surveysCount: importData.surveys.length,
        questionsCount: importData.questions.length
      });
    }

    if (duplicateSurveyIds.length > 0 && overwrite) {
      store.surveys = store.surveys.filter((survey: { surveyId: string }) => !incomingSurveyIds.has(survey.surveyId));
      store.questions = store.questions.filter((question: { surveyId: string }) => !incomingSurveyIds.has(question.surveyId));
    }

    const errors: Record<string, unknown>[] = [];
    const surveysForValidation = [...store.surveys, ...importData.surveys];
    const questionsForValidation = [...store.questions, ...importData.questions];

    importData.surveys.forEach((survey, index) => {
      const validation = validator.validateSurvey(survey);
      if (!validation.isValid) {
        errors.push({
          type: "survey",
          index: index + 1,
          surveyId: survey.surveyId,
          errors: validation.errors
        });
      }
      if (!overwrite && store.surveys.find((s: { surveyId: string }) => s.surveyId === survey.surveyId)) {
        errors.push({
          type: "survey",
          index: index + 1,
          surveyId: survey.surveyId,
          errors: ["Survey ID already exists in the system"]
        });
      }
    });

    importData.questions.forEach((question, index) => {
      const validation = validator.validateQuestion(question, surveysForValidation, questionsForValidation);
      if (!validation.isValid) {
        errors.push({
          type: "question",
          index: index + 1,
          questionId: question.questionId,
          errors: validation.errors
        });
      }
    });

    if (errors.length > 0) {
      return err(400, "Validation failed", {
        validationErrors: errors,
        surveysCount: importData.surveys.length,
        questionsCount: importData.questions.length
      });
    }

    store.surveys.push(...importData.surveys);
    store.questions.push(...importData.questions);
    await writeStore(store);

    return ok(
      {
        message: "Import successful",
        overwrite,
        surveysImported: importData.surveys.length,
        questionsImported: importData.questions.length,
        surveys: importData.surveys
      },
      { status: 201 }
    );
  }, "Failed to import file");
}

async function parseXLSX(bytes: Uint8Array): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as any);
  const result: ImportResult = { surveys: [], questions: [] };

  const surveySheet = workbook.getWorksheet("Survey Master");
  if (surveySheet) {
    const headers: string[] = [];
    surveySheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = normalizeCellValue(cell.value) as string;
    });
    surveySheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }
      const survey: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const fieldName = mapSurveyColumnToField(header);
          survey[fieldName] = normalizeCellValue(cell.value);
        }
      });
      if (survey.surveyId) {
        result.surveys.push(survey);
      }
    });
  }

  const questionSheet = workbook.getWorksheet("Question Master");
  if (questionSheet) {
    const headers: string[] = [];
    questionSheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = normalizeCellValue(cell.value) as string;
    });
    const questionsByKey: Record<string, Record<string, unknown>> = {};
    questionSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }
      const questionRow: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const fieldName = mapQuestionColumnToField(header);
          questionRow[fieldName] = normalizeCellValue(cell.value);
        }
      });
      if (questionRow.surveyId && questionRow.questionId) {
        const key = `${questionRow.surveyId}_${questionRow.questionId}_${questionRow.questionType}`;
        if (!questionsByKey[key]) {
          questionsByKey[key] = {
            surveyId: questionRow.surveyId,
            questionId: questionRow.questionId,
            questionType: questionRow.questionType,
            isDynamic: questionRow.isDynamic,
            isMandatory: questionRow.isMandatory,
            sourceQuestion: questionRow.sourceQuestion || "",
            textInputType: questionRow.textInputType || "None",
            textLimitCharacters: questionRow.textLimitCharacters || "",
            maxValue: questionRow.maxValue || "",
            minValue: questionRow.minValue || "",
            tableHeaderValue: questionRow.tableHeaderValue || "",
            tableQuestionValue: questionRow.tableQuestionValue || "",
            questionMediaLink: questionRow.questionMediaLink || "",
            questionMediaType: questionRow.questionMediaType || "None",
            mode: questionRow.mode || "None",
            translations: {}
          };
        }
        const language = (questionRow.mediumInEnglish || questionRow.medium || "English") as string;
        (questionsByKey[key].translations as Record<string, unknown>)[language] = {
          questionDescription: questionRow.questionDescription || "",
          questionDescriptionOptional: questionRow.questionDescriptionOptional || "",
          tableHeaderValue: questionRow.tableHeaderValue || "",
          tableQuestionValue: questionRow.tableQuestionValue || "",
          options: parseOptions(questionRow)
        };
      }
    });
    result.questions = Object.values(questionsByKey).map(applyPrimaryTranslation);
  }

  return result;
}

function parseCSV(content: string, sheetType: string): ImportResult {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  const inferredType = inferSheetType(records, sheetType);

  if (inferredType === "survey") {
    return { surveys: records.map(mapSurveyRecord), questions: [] };
  }
  if (inferredType === "question") {
    const questionsByKey: Record<string, Record<string, unknown>> = {};
    records.forEach((record: Record<string, unknown>) => {
      const questionRow = mapQuestionRecord(record);
      if (questionRow.surveyId && questionRow.questionId) {
        const key = `${questionRow.surveyId}_${questionRow.questionId}_${questionRow.questionType}`;
        if (!questionsByKey[key]) {
          questionsByKey[key] = {
            surveyId: questionRow.surveyId,
            questionId: questionRow.questionId,
            questionType: questionRow.questionType,
            isDynamic: questionRow.isDynamic,
            isMandatory: questionRow.isMandatory,
            sourceQuestion: questionRow.sourceQuestion || "",
            textInputType: questionRow.textInputType || "None",
            textLimitCharacters: questionRow.textLimitCharacters || "",
            maxValue: questionRow.maxValue || "",
            minValue: questionRow.minValue || "",
            tableHeaderValue: questionRow.tableHeaderValue || "",
            tableQuestionValue: questionRow.tableQuestionValue || "",
            questionMediaLink: questionRow.questionMediaLink || "",
            questionMediaType: questionRow.questionMediaType || "None",
            mode: questionRow.mode || "None",
            translations: {}
          };
        }
        const language = (questionRow.mediumInEnglish || questionRow.medium || "English") as string;
        (questionsByKey[key].translations as Record<string, unknown>)[language] = {
          questionDescription: questionRow.questionDescription || "",
          questionDescriptionOptional: questionRow.questionDescriptionOptional || "",
          tableHeaderValue: questionRow.tableHeaderValue || "",
          tableQuestionValue: questionRow.tableQuestionValue || "",
          options: parseOptions(questionRow)
        };
      }
    });
    return { surveys: [], questions: Object.values(questionsByKey).map(applyPrimaryTranslation) };
  }
  return { surveys: [], questions: [] };
}

function mapSurveyColumnToField(columnName: string) {
  const normalized = normalizeHeaderKey(columnName);
  const mapping: Record<string, string> = {
    surveyid: "surveyId",
    surveyname: "surveyName",
    surveydescription: "surveyDescription",
    availablemediums: "availableMediums",
    hierarchicalaccesslevel: "hierarchicalAccessLevel",
    public: "public",
    inschool: "inSchool",
    acceptmultipleentries: "acceptMultipleEntries",
    launchdate: "launchDate",
    closedate: "closeDate",
    mode: "mode",
    visibleonreportbot: "visibleOnReportBot",
    isactive: "isActive",
    downloadresponse: "downloadResponse",
    geofencing: "geoFencing",
    geotagging: "geoTagging",
    testsurvey: "testSurvey"
  };
  return mapping[normalized] || columnName;
}

function mapQuestionColumnToField(columnName: string) {
  const normalized = normalizeHeaderKey(columnName);
  const optionMatch = normalized.match(/^option(\d+)(inenglish|children)?$/);
  if (optionMatch) {
    const index = optionMatch[1];
    const suffix = optionMatch[2];
    if (suffix === "inenglish") return `option${index}InEnglish`;
    if (suffix === "children") return `option${index}Children`;
    return `option${index}`;
  }
  const mapping: Record<string, string> = {
    surveyid: "surveyId",
    medium: "medium",
    mediuminenglish: "mediumInEnglish",
    questionid: "questionId",
    questiontype: "questionType",
    isdynamic: "isDynamic",
    questiondescriptionoptional: "questionDescriptionOptional",
    maxvalue: "maxValue",
    minvalue: "minValue",
    ismandatory: "isMandatory",
    tableheadervalue: "tableHeaderValue",
    tablequestionvalue: "tableQuestionValue",
    sourcequestion: "sourceQuestion",
    textinputtype: "textInputType",
    textlimitcharacters: "textLimitCharacters",
    mode: "mode",
    questionmedialink: "questionMediaLink",
    questionmediatype: "questionMediaType",
    questiondescription: "questionDescription"
  };
  if (normalized.startsWith("questiondescription") && normalized !== "questiondescriptionoptional") {
    return "questionDescription";
  }
  return mapping[normalized] || columnName;
}

function mapSurveyRecord(record: Record<string, unknown>) {
  const survey: Record<string, unknown> = {};
  Object.keys(record).forEach((key) => {
    const fieldName = mapSurveyColumnToField(key);
    survey[fieldName] = record[key];
  });
  return survey;
}

function mapQuestionRecord(record: Record<string, unknown>) {
  const question: Record<string, unknown> = {};
  Object.keys(record).forEach((key) => {
    const fieldName = mapQuestionColumnToField(key);
    question[fieldName] = record[key];
  });
  return question;
}

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const obj = value as { text?: string; richText?: Array<{ text?: string }>; result?: unknown; hyperlink?: string };
    if (obj.text) return obj.text;
    if (obj.richText) return obj.richText.map((part) => part.text || "").join("");
    if (obj.result !== undefined) return obj.result;
    if (obj.hyperlink) return obj.text || obj.hyperlink;
  }
  return value;
}

function normalizeHeaderKey(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function inferSheetType(records: Record<string, unknown>[], sheetType: string) {
  if (sheetType === "survey" || sheetType === "question") {
    return sheetType;
  }
  if (!records || records.length === 0) {
    return null;
  }
  const sample = records[0];
  const normalizedKeys = new Set(Object.keys(sample).map((key) => normalizeHeaderKey(key)));
  const hasSurveyId = normalizedKeys.has("surveyid");
  const hasQuestionId = normalizedKeys.has("questionid");
  if (hasQuestionId) return "question";
  if (hasSurveyId) return "survey";
  return null;
}

function applyPrimaryTranslation(question: Record<string, unknown>) {
  const translations = (question.translations || {}) as Record<string, Record<string, unknown>>;
  const languages = Object.keys(translations);
  const primaryLanguage = languages.includes("English") ? "English" : languages[0] || "English";
  const primary = translations[primaryLanguage] || {};
  return {
    ...question,
    medium: question.medium || primaryLanguage,
    questionDescription: primary.questionDescription || question.questionDescription || "",
    questionDescriptionOptional: primary.questionDescriptionOptional || question.questionDescriptionOptional || "",
    tableHeaderValue: primary.tableHeaderValue || question.tableHeaderValue || "",
    tableQuestionValue: primary.tableQuestionValue || question.tableQuestionValue || "",
    options: primary.options || question.options || []
  };
}

function parseOptions(questionRow: Record<string, unknown>) {
  const options: Array<{ text: unknown; textInEnglish: unknown; children: unknown }> = [];
  for (let i = 1; i <= 20; i += 1) {
    const optionKey = `option${i}`;
    const optionText = normalizeCellValue(questionRow[optionKey]) || normalizeCellValue(questionRow[`Option_${i}`]);
    if (optionText) {
      const optionInEnglishKey = `option${i}InEnglish`;
      const optionChildrenKey = `option${i}Children`;
      options.push({
        text: optionText,
        textInEnglish:
          normalizeCellValue(questionRow[optionInEnglishKey]) || normalizeCellValue(questionRow[`Option_${i}_in_English`]) || optionText,
        children: normalizeCellValue(questionRow[optionChildrenKey]) || normalizeCellValue(questionRow[`Option_${i}Children`]) || ""
      });
    }
  }
  return options;
}
