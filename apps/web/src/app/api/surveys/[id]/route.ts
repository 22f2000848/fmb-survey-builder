import { readStore, writeStore } from "@/server/legacy/data/store";
import { validator } from "@/server/legacy/modules";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { id } = await params;
    const store = await readStore();
    const survey = store.surveys.find((s: { surveyId: string }) => s.surveyId === id);
    if (!survey) {
      return err(404, "Survey not found");
    }
    return ok(survey);
  }, "Failed to fetch survey");
}

export async function PUT(request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { id } = await params;
    const surveyData = await request.json();

    if (surveyData?.surveyId !== id) {
      return err(400, "Survey ID mismatch", {
        message: "Payload surveyId must match the survey ID in the URL path",
        details: [{ field: "surveyId", expected: id, received: surveyData?.surveyId || "" }],
        errors: ["Payload surveyId must match the survey ID in the URL path"]
      });
    }

    const validation = validator.validateSurvey(surveyData);
    if (!validation.isValid) {
      return err(400, "Validation failed", { errors: validation.errors });
    }

    const store = await readStore();
    const index = store.surveys.findIndex((s: { surveyId: string }) => s.surveyId === id);
    if (index === -1) {
      return err(404, "Survey not found", { errors: ["Survey not found"] });
    }

    store.surveys[index] = surveyData;
    await writeStore(store);
    return ok(surveyData);
  }, "Failed to update survey");
}

export async function DELETE(_request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { id } = await params;
    const store = await readStore();
    const index = store.surveys.findIndex((s: { surveyId: string }) => s.surveyId === id);
    if (index === -1) {
      return err(404, "Survey not found");
    }
    store.surveys.splice(index, 1);
    store.questions = store.questions.filter((q: { surveyId: string }) => q.surveyId !== id);
    await writeStore(store);
    return ok({ message: "Survey deleted successfully" });
  }, "Failed to delete survey");
}
