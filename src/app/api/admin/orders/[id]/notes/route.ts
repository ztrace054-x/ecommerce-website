import { api, assertOrigin, readJson, json } from "@/lib/security/http";
import { requireAdmin } from "@/lib/auth/admin";
import { idSchema, noteSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/security/rate-limit";
import { rpc } from "@/db/client";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    assertOrigin(request);
    const admin = await requireAdmin(request);
    const id = idSchema.parse((await ctx.params).id);
    const input = await readJson(request, noteSchema);
    await rateLimit(request, "admin-note-write", 30, 60, admin.id);
    await rpc("ai_admin_add_note", {
      p_actor: admin.id,
      p_order_id: id,
      p_note: input.note,
    });
    return json({ saved: true }, 201);
  });
}
