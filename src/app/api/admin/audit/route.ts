import { z } from "zod";
import { api, json } from "@/lib/security/http";
import { requireAdmin } from "@/lib/auth/admin";
import { rpc } from "@/db/client";
const filters = z
  .object({ page: z.coerce.number().int().min(1).max(10000).default(1) })
  .strict();
export async function GET(request: Request) {
  return api(async () => {
    const admin = await requireAdmin(request);
    const { page } = filters.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return json(
      await rpc("ai_admin_audit", { p_actor: admin.id, p_page: page }),
    );
  });
}
