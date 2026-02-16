import { readStore, writeStore } from "@/server/legacy/data/store";
import { validator } from "@/server/legacy/modules";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { id } = await params;
    const store = await readStore();
    const questions = store.questions.filter((q: { surveyId: string }) => q.surveyId === id);
    return ok(questions);
  }, "Failed to fetch questions");
}

export async function POST(request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { id } = await params;
    const payload = await request.json();
    const questionData = { ...payload, surveyId: id };
    const store = await readStore();

    const survey = store.surveys.find((s: { surveyId: string }) => s.surveyId === id);
    if (!survey) {
      return err(404, "Survey not found", { errors: [`Survey with ID "${id}" not found`] });
    }
    if (!questionData?.questionId || String(questionData.questionId).trim() === "") {
      return err(400, "Question ID is required", { errors: ["Question ID is required"] });
    }
    if (!questionData?.questionType || String(questionData.questionType).trim() === "") {
      return err(400, "Question Type is required", { errors: ["Question Type is required"] });
    }

    const validation = validator.validateQuestion(questionData, store.surveys, store.questions);
    if (!validation.isValid) {
      return err(400, "Validation failed", { errors: validation.errors });
    }

    const existing = store.questions.find(
      (q: { surveyId: string; questionId: string }) => q.surveyId === id && q.questionId === questionData.questionId
    );
    if (existing) {
      return err(400, "Question ID already exists", {
        errors: [
          `Question ID "${questionData.questionId}" already exists for this survey. Please use a unique Question ID.`
        ]
      });
    }

    store.questions.push(questionData);
    await writeStore(store);
    return ok(questionData, { status: 201 });
  }, "Failed to create question");
}
