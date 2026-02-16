import { config } from "@/server/config";
import { err, ok, withErrorBoundary } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withErrorBoundary(async () => {
    const body = await request.json();
    const text = body?.text;
    const source = body?.source || "en";
    const target = body?.target;

    if (!text || !target) {
      return err(400, "Missing text or target language", {
        message: 'Both "text" and "target" are required for translation',
        details: [{ field: !text ? "text" : "target" }],
        errors: ['Both "text" and "target" are required for translation']
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.TRANSLATE_TIMEOUT_MS);
    try {
      const payload: Record<string, string> = {
        q: text,
        source,
        target,
        format: "text"
      };
      if (config.TRANSLATE_API_KEY) {
        payload.api_key = config.TRANSLATE_API_KEY;
      }

      const response = await fetch(config.TRANSLATE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const raw = await response.text();
      if (!response.ok) {
        return err(502, "Translation failed", {
          message: "Upstream translation service returned a non-success status",
          details: [{ upstreamStatus: response.status }, { upstreamBody: raw }],
          errors: ["Upstream translation service returned a non-success status"]
        });
      }

      try {
        const parsed = JSON.parse(raw);
        return ok({ translatedText: parsed.translatedText || parsed.translation || "" });
      } catch {
        return err(502, "Translation failed", {
          message: "Upstream translation response was not valid JSON",
          details: [{ upstreamBody: raw }],
          errors: ["Upstream translation response was not valid JSON"]
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Translation request failed";
      return err(502, "Translation failed", {
        message,
        details: [{ code: error instanceof Error && "name" in error ? error.name : "UNKNOWN" }],
        errors: [message]
      });
    } finally {
      clearTimeout(timeout);
    }
  }, "Translation failed");
}
