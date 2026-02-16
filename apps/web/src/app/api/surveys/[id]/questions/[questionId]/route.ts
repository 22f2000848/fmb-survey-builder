import { readStore, writeStore } from "@/server/legacy/data/store";
import { validator } from "@/server/legacy/modules";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; questionId: string }> };

export async function PUT(request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { id, questionId } = await params;
    const payload = await request.json();
    const questionData = { ...payload, surveyId: id, questionId };

    const store = await readStore();
    const validation = validator.validateQuestion(questionData, store.surveys, store.questions);
    if (!validation.isValid) {
      return err(400, "Validation failed", { errors: validation.errors });
    }

    const index = store.questions.findIndex(
      (q: { surveyId: string; questionId: string }) => q.surveyId === id && q.questionId === questionId
    );
    if (index === -1) {
      return err(404, "Question not found", { errors: ["Question not found"] });
    }

    store.questions[index] = questionData;
    await writeStore(store);
    return ok(questionData);
  }, "Failed to update question");
}

export async function DELETE(_request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { id, questionId } = await params;
    const store = await readStore();
    const index = store.questions.findIndex(
      (q: { surveyId: string; questionId: string }) => q.surveyId === id && q.questionId === questionId
    );
    if (index === -1) {
      return err(404, "Question not found");
    }
    store.questions.splice(index, 1);
    await writeStore(store);
    return ok({ message: "Question deleted successfully" });
  }, "Failed to delete question");
}
