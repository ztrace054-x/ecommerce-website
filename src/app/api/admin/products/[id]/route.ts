import { api, assertOrigin, readJson, json } from "@/lib/security/http";
import { requireAdmin } from "@/lib/auth/admin";
import { idSchema, productSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/security/rate-limit";
import { rpc } from "@/db/client";
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    assertOrigin(request);
    const admin = await requireAdmin(request);
    const id = idSchema.parse((await ctx.params).id);
    const input = await readJson(request, productSchema);
    await rateLimit(request, "admin-product-write", 20, 60, admin.id);
    return json({
      product: await rpc("ai_admin_save_product", {
        p_actor: admin.id,
        p_id: id,
        p_product: input,
      }),
    });
  });
}
