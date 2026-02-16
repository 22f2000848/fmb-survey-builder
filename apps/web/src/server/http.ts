import { NextResponse } from "next/server";
import { logError } from "@/server/logger";

export type ErrorBody = {
  error: string;
  details?: unknown;
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function err(status: number, error: string, details?: unknown) {
  const payload: ErrorBody = details === undefined ? { error } : { error, details };
  return NextResponse.json(payload, { status });
}

export async function withErrorBoundary(
  fn: () => Promise<Response>,
  fallbackMessage: string
): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    const details =
      error instanceof Error
        ? {
            message: error.message
          }
        : { value: String(error) };
    logError(fallbackMessage, details as Record<string, unknown>);
    return err(500, fallbackMessage, details);
  }
}
