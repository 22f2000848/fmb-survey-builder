import { config } from "@/server/config";
import { err } from "@/server/http";

type Bucket = {
  resetAt: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(request: Request, keyPrefix: string, max = config.RATE_LIMIT_MAX_REQUESTS) {
  const ip = getClientIp(request);
  const now = Date.now();
  const key = `${keyPrefix}:${ip}`;
  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + config.RATE_LIMIT_WINDOW_MS
    });
    return null;
  }
  existing.count += 1;
  buckets.set(key, existing);

  if (existing.count > max) {
    return err(429, "Too many requests", {
      retryAfterMs: Math.max(0, existing.resetAt - now)
    });
  }

  return null;
}
