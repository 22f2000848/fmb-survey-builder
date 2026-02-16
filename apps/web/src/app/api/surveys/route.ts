import { readStore, writeStore } from "@/server/legacy/data/store";
import { validator } from "@/server/legacy/modules";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  return withErrorBoundary(async () => {
    const store = await readStore();
    return ok(store.surveys);
  }, "Failed to fetch surveys");
}

export async function POST(request: Request) {
  return withErrorBoundary(async () => {
    const surveyData = await request.json();

    if (!surveyData?.surveyId || String(surveyData.surveyId).trim() === "") {
      return err(400, "Survey ID is required", { errors: ["Survey ID is required"] });
    }
    if (!surveyData?.surveyName || String(surveyData.surveyName).trim() === "") {
      return err(400, "Survey Name is required", { errors: ["Survey Name is required"] });
    }
    if (!surveyData?.surveyDescription || String(surveyData.surveyDescription).trim() === "") {
      return err(400, "Survey Description is required", { errors: ["Survey Description is required"] });
    }

    const validation = validator.validateSurvey(surveyData);
    if (!validation.isValid) {
      return err(400, "Validation failed", { errors: validation.errors });
    }

    const store = await readStore();
    if (store.surveys.find((s: { surveyId: string }) => s.surveyId === surveyData.surveyId)) {
      return err(400, "Survey ID already exists", {
        errors: [`Survey ID "${surveyData.surveyId}" already exists. Please use a unique Survey ID.`]
      });
    }

    store.surveys.push(surveyData);
    await writeStore(store);
    return ok(surveyData, { status: 201 });
  }, "Failed to create survey");
}
