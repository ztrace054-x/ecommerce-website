import { trackingSchema } from "@/lib/validation";
import { api, assertOrigin, readJson, json } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { hashToken } from "@/lib/security/crypto";
import { rpc } from "@/db/client";
import type { PublicOrder } from "@/lib/domain";
import { AppError } from "@/lib/errors";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const input = await readJson(request, trackingSchema);
    await rateLimit(request, "track", 10);
    await rateLimit(request, "track-code", 5, 60, input.orderCode);
    const order = await rpc<PublicOrder | null>("ai_track_order", {
      p_order_code: input.orderCode,
      p_email: input.customerEmail,
      p_token_hash: hashToken(input.accessKey),
    });
    if (!order)
      throw new AppError(404, "not_found", "অর্ডার বা যাচাইয়ের তথ্য মেলেনি।");
    return json({ order });
  });
}
