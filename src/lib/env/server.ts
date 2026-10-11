import "server-only";

const serverVariableNames = [
  "DATABASE_URL",
  "TURNSTILE_SECRET_KEY",
  "RESEND_API_KEY",
  "ADMIN_SECRET",
  "ENCRYPTION_KEY",
] as const;

type ServerVariableName = (typeof serverVariableNames)[number];

/** Read only when an approved server integration actually needs configuration. */
export function requireServerEnv(name: ServerVariableName): string {
  if (!serverVariableNames.includes(name)) {
    throw new Error("Unsupported server environment variable name.");
  }

  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing server environment variable: ${name}`);
  }

  // Preserve the value; integration-specific URL/key validation comes later.
  // Never include this value in an error, log, public object, or client props.
  return value;
}
