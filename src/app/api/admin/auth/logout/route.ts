import { api, assertOrigin, json } from "@/lib/security/http";
import { sessionCookie, setAdminCookie } from "@/lib/auth/admin";
import { hashToken } from "@/lib/security/crypto";
import { rpc } from "@/db/client";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const token = sessionCookie(request);
    if (token)
      await rpc("ai_close_admin_session", { p_token_hash: hashToken(token) });
    const response = json({ authenticated: false });
    setAdminCookie(response, request, "", 0);
    return response;
  });
}
