import { readStore, writeStore } from "@/server/legacy/data/store";
import { validator } from "@/server/legacy/modules";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

function normalizeQuestionId(value: unknown) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  if (/^q/i.test(trimmed)) {
    return `Q${trimmed.slice(1)}`;
  }
  if (/^\d+(\.\d+)*$/.test(trimmed)) {
    return `Q${trimmed}`;
  }
  return trimmed;
}

type Params = { params: Promise<{ id: string; questionId: string }> };

export async function POST(request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { id, questionId } = await params;
    const body = await request.json();
    const requestedQuestionId = normalizeQuestionId(body?.newQuestionId);

    const store = await readStore();
    const originalQuestion = store.questions.find(
      (q: { surveyId: string; questionId: string }) => q.surveyId === id && q.questionId === questionId
    );
    if (!originalQuestion) {
      return err(404, "Question not found");
    }

    let newQuestionId = requestedQuestionId;
    if (newQuestionId) {
      if (!/^Q\d+(\.\d+)*$/.test(newQuestionId)) {
        return err(400, "Invalid Question ID format", {
          message: "newQuestionId must be in format Q1, Q1.1, Q2, etc.",
          details: [{ field: "newQuestionId", value: requestedQuestionId }]
        });
      }
    } else {
      const surveyQuestions = store.questions.filter((q: { surveyId: string }) => q.surveyId === id);
      const questionNumbers = surveyQuestions
        .map((q: { questionId: string }) => {
          const match = q.questionId.match(/^Q(\d+)(?:\.(\d+))?$/);
          return match ? Number.parseInt(match[1], 10) : 0;
        })
        .filter((n: number) => n > 0);
      const maxQuestionNum = questionNumbers.length > 0 ? Math.max(...questionNumbers) : 0;
      newQuestionId = `Q${maxQuestionNum + 1}`;
    }

    const duplicatedQuestion = {
      ...originalQuestion,
      questionId: newQuestionId,
      sourceQuestion: "",
      optionChildren: originalQuestion.optionChildren || ""
    };

    const existing = store.questions.find(
      (q: { surveyId: string; questionId: string }) => q.surveyId === id && q.questionId === newQuestionId
    );
    if (existing) {
      return err(400, "Question ID already exists", {
        message: `Question ID "${newQuestionId}" already exists for this survey`,
        details: [{ field: "newQuestionId", value: newQuestionId }]
      });
    }

    const validation = validator.validateQuestion(duplicatedQuestion, store.surveys, store.questions);
    if (!validation.isValid) {
      return err(400, "Validation failed", { errors: validation.errors });
    }

    store.questions.push(duplicatedQuestion);
    await writeStore(store);
    return ok(duplicatedQuestion, { status: 201 });
  }, "Failed to duplicate question");
}
