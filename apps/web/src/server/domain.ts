import { DomainError } from "@cg-dump/core";

import { err } from "@/server/http";

export function handleDomainError(error: unknown, fallback: string) {
  if (error instanceof DomainError) {
    return err(error.status, error.message, error.details);
  }
  return err(500, fallback, {
    message: error instanceof Error ? error.message : String(error)
  });
}
