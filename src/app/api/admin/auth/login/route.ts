import { api, assertOrigin, readJson, json } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { hashToken } from "@/lib/security/crypto";
import { loginSchema } from "@/lib/validation";
import { authRequest, setAdminCookie } from "@/lib/auth/admin";
import { rpc } from "@/db/client";
import { AppError } from "@/lib/errors";
import { z } from "zod";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const input = await readJson(request, loginSchema, 4096);
    await rateLimit(request, "login-client", 5, 60);
    await rateLimit(request, "login-account", 10, 900, input.email);
    const login = await authRequest<{
      access_token: string;
      expires_in: number;
      user: { id: string; factors?: { id: string; factor_type: string; status: string }[] };
    }>("token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email: input.email, password: input.password }),
    });
    // A password-only provider token never becomes an application session.
    const factor = login.user.factors?.find(f => f.factor_type === "totp" && f.status === "verified");
    if (!factor || !z.string().uuid().safeParse(factor.id).success)
      throw new AppError(401, "mfa_required", "অ্যাডমিনের অথেনটিকেটর আগে নিরাপদভাবে সেট আপ করুন।");
    const challenge = await authRequest<{ id: string }>(`factors/${factor.id}/challenge`, {
      method: "POST", body: JSON.stringify({}),
    }, login.access_token);
    const verified = await authRequest<{ access_token: string; expires_in: number }>(`factors/${factor.id}/verify`, {
      method: "POST", body: JSON.stringify({ challenge_id: challenge.id, code: input.mfaCode }),
    }, login.access_token);
    const user = await authRequest<{ id: string }>("user", {}, verified.access_token);
    if (user.id !== login.user.id || !Number.isFinite(verified.expires_in) || verified.expires_in <= 0)
      throw new AppError(401, "authentication", "আবার অ্যাডমিন লগইন করুন।");
    const age = Math.min(Math.floor(verified.expires_in), 3600);
    await rpc("ai_open_admin_session", {
      p_actor: user.id,
      p_token_hash: hashToken(verified.access_token),
      p_expires_at: new Date(Date.now() + age * 1000).toISOString(),
    });
    const response = json({ authenticated: true });
    setAdminCookie(response, request, verified.access_token, age);
    return response;
  });
}
