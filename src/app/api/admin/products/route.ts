import { api, assertOrigin, readJson, json } from "@/lib/security/http";
import { requireAdmin } from "@/lib/auth/admin";
import { productSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/security/rate-limit";
import { rpc } from "@/db/client";
export async function GET(request: Request) {
  return api(async () => {
    const admin = await requireAdmin(request);
    return json({
      products: await rpc("ai_admin_products", { p_actor: admin.id }),
    });
  });
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const admin = await requireAdmin(request);
    const input = await readJson(request, productSchema);
    await rateLimit(request, "admin-product-write", 20, 60, admin.id);
    return json(
      {
        product: await rpc("ai_admin_save_product", {
          p_actor: admin.id,
          p_id: null,
          p_product: input,
        }),
      },
      201,
    );
  });
}
