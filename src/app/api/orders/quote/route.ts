import { assertCheckoutOpen } from "@/lib/config";
import { quoteSchema } from "@/lib/validation";
import { api, assertOrigin, readJson, json } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  createOrderCode,
  createToken,
  hashToken,
  randomUUID,
} from "@/lib/security/crypto";
import { rpc } from "@/db/client";
import { AppError } from "@/lib/errors";
export async function POST(request: Request) {
  return api(async () => {
    const settings = assertCheckoutOpen();
    assertOrigin(request);
    const input = await readJson(request, quoteSchema);
    await rateLimit(request, "quote", 5);
    for (let attempt = 0; attempt < 3; attempt++) {
      const quoteToken = createToken();
      try {
        const quote = await rpc<Record<string, unknown>>("ai_create_quote", {
          p_id: randomUUID(),
          p_order_code: createOrderCode(),
          p_token_hash: hashToken(quoteToken),
          p_product_id: input.productId,
          p_recipient: settings.recipient,
          p_method: settings.paymentMethod,
        });
        return json({ quote: { ...quote, quoteToken } }, 201);
      } catch (error) {
        if (
          !(error instanceof AppError && error.code === "duplicate") ||
          attempt === 2
        )
          throw error;
      }
    }
    throw new AppError(503, "quote_unavailable", "আবার চেষ্টা করুন।");
  });
}
