import { api, assertOrigin, readJson, json } from "@/lib/security/http";
import { requireAdmin } from "@/lib/auth/admin";
import { idSchema, statusSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/security/rate-limit";
import { rpc } from "@/db/client";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, ctx: Context) {
  return api(async () => {
    const admin = await requireAdmin(request);
    const id = idSchema.parse((await ctx.params).id);
    return json(
      await rpc("ai_admin_order_detail", { p_actor: admin.id, p_order_id: id }),
    );
  });
}
export async function PATCH(request: Request, ctx: Context) {
  return api(async () => {
    assertOrigin(request);
    const admin = await requireAdmin(request);
    const id = idSchema.parse((await ctx.params).id);
    const input = await readJson(request, statusSchema);
    await rateLimit(request, "admin-order-write", 30, 60, admin.id);
    return json({
      order: await rpc("ai_admin_update_order", {
        p_actor: admin.id,
        p_order_id: id,
        p_status: input.status,
        p_expected_version: input.expectedVersion,
        p_note: input.note,
        p_customer_message: input.customerMessage,
        p_verified_amount: input.verifiedAmountPoisha ?? null,
      }),
    });
  });
}
