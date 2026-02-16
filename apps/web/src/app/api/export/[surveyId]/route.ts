import { readStore } from "@/server/legacy/data/store";
import { excelGenerator } from "@/server/legacy/modules";
import { err, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ surveyId: string }> };

export async function GET(_request: Request, { params }: Params) {
  return withErrorBoundary(async () => {
    const { surveyId } = await params;
    const store = await readStore();
    const survey = store.surveys.find((s: { surveyId: string }) => s.surveyId === surveyId);
    if (!survey) {
      return err(404, "Survey not found");
    }

    const questions = store.questions.filter((q: { surveyId: string }) => q.surveyId === surveyId);
    const workbook = await excelGenerator.generateExcel(survey, questions);
    const buffer = await workbook.xlsx.writeBuffer();

    const rawFilename = `${survey.surveyId}_dump.xlsx`;
    const safeFilename = rawFilename.replace(/["\\]/g, "_");
    const encodedFilename = encodeURIComponent(rawFilename);

    return new Response(buffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
      }
    });
  }, "Failed to export survey");
}
