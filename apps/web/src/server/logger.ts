type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
};

function emit(payload: LogPayload) {
  const line = JSON.stringify(payload);
  if (payload.level === "error") {
    console.error(line);
    return;
  }
  if (payload.level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  emit({ level: "info", message, timestamp: new Date().toISOString(), context });
}

export function logWarn(message: string, context?: Record<string, unknown>) {
  emit({ level: "warn", message, timestamp: new Date().toISOString(), context });
}

export function logError(message: string, context?: Record<string, unknown>) {
  emit({ level: "error", message, timestamp: new Date().toISOString(), context });
}
