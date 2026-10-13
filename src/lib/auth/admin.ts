import "server-only";
import { databaseConfig, applicationOrigin } from "../config.ts";
import { AppError } from "../errors.ts";
import { rpc } from "../../db/client.ts";
import { hashToken } from "../security/crypto.ts";

export const adminCookieName = "ai_admin_session";
export type AdminSession = { id: string; authUserId: string; email: string; expiresAt: string };
export function sessionCookie(request: Request): string | null {
  const matches = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((v) => v.trim())
    .filter((v) => v.startsWith(`${adminCookieName}=`));
  if (matches.length !== 1) return null;
  const value = matches[0]!.slice(adminCookieName.length + 1);
  return /^[A-Za-z0-9._-]{20,8192}$/.test(value) ? value : null;
}
export async function authRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const config = databaseConfig();
  if (!config)
    throw new AppError(
      503,
      "auth_unavailable",
      "অ্যাডমিন লগইন এখন চালু করা যায়নি।",
    );
  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/${path}`, {
      ...init,
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        apikey: config.key,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new AppError(
      503,
      "auth_unavailable",
      "অ্যাডমিন লগইন এখন চালু করা যায়নি।",
    );
  }
  if (!response.ok) {
    if ([400, 401, 403, 422].includes(response.status))
      throw new AppError(
        401,
        "authentication",
        "ইমেইল, পাসওয়ার্ড ও অথেনটিকেটর কোড যাচাই করে আবার চেষ্টা করুন।",
      );
    throw new AppError(
      503,
      "auth_unavailable",
      "অ্যাডমিন লগইন এখন চালু করা যায়নি।",
    );
  }
  return response.json() as Promise<T>;
}
export async function requireAdmin(request: Request): Promise<AdminSession> {
  const token = sessionCookie(request);
  if (!token)
    throw new AppError(401, "unauthorized", "আবার অ্যাডমিন লগইন করুন।");
  const session = await rpc<AdminSession | null>("ai_get_admin_session", {
    p_token_hash: hashToken(token),
  });
  if (!session)
    throw new AppError(401, "unauthorized", "আবার অ্যাডমিন লগইন করুন।");
  // Ask the auth provider to verify the token, not a client-controlled JWT decode.
  const user = await authRequest<{ id: string }>("user", {}, token);
  if (user.id !== session.authUserId)
    throw new AppError(401, "unauthorized", "আবার অ্যাডমিন লগইন করুন।");
  return session;
}
export function setAdminCookie(
  response: Response,
  request: Request,
  token: string,
  maxAge: number,
) {
  const secure = applicationOrigin(request).startsWith("https:");
  response.headers.append(
    "Set-Cookie",
    `${adminCookieName}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`,
  );
}
