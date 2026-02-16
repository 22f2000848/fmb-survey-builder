import { readStore, writeStore } from "@/server/legacy/data/store";
import { validator } from "@/server/legacy/modules";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { id } = await params;
    const body = await request.json();
    const newSurveyId = body?.newSurveyId;
    if (!newSurveyId) {
      return err(400, "New Survey ID is required");
    }

    const store = await readStore();
    const originalSurvey = store.surveys.find((s: { surveyId: string }) => s.surveyId === id);
    if (!originalSurvey) {
      return err(404, "Survey not found");
    }
    if (store.surveys.find((s: { surveyId: string }) => s.surveyId === newSurveyId)) {
      return err(400, "Survey ID already exists");
    }

    const duplicatedSurvey = { ...originalSurvey, surveyId: newSurveyId, launchDate: "", closeDate: "" };
    const validation = validator.validateSurvey(duplicatedSurvey);
    if (!validation.isValid) {
      return err(400, "Validation failed", { errors: validation.errors });
    }

    const originalQuestions = store.questions.filter((q: { surveyId: string }) => q.surveyId === id);
    const duplicatedQuestions = originalQuestions.map((q: Record<string, unknown>) => ({
      ...q,
      surveyId: newSurveyId
    }));

    store.surveys.push(duplicatedSurvey);
    store.questions.push(...duplicatedQuestions);
    await writeStore(store);

    return ok(
      {
        survey: duplicatedSurvey,
        questionsCount: duplicatedQuestions.length
      },
      { status: 201 }
    );
  }, "Failed to duplicate survey");
}
