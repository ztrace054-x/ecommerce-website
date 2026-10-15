import { api, json } from "@/lib/security/http";
import { requireAdmin } from "@/lib/auth/admin";
import { rpc } from "@/db/client";
export async function GET(request: Request) {
  return api(async () => {
    const admin = await requireAdmin(request);
    return json({
      overview: await rpc("ai_admin_overview", { p_actor: admin.id }),
    });
  });
}
