import "server-only";

export function isDatabaseError(error: unknown, code: string, constraint?: string): boolean {
  let current: unknown = error;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 8 && current && typeof current === "object"; depth++) {
    if (seen.has(current)) return false;
    seen.add(current);
    const detail = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (detail.code === code && (constraint === undefined || detail.constraint === constraint)) return true;
    current = detail.cause;
  }
  return false;
}

/** Never attach the driver's query, parameters, or credential-bearing cause. */
export class DataAccessError extends Error {
  constructor(message = "Database operation failed.") {
    super(message);
    this.name = "DataAccessError";
  }
}
