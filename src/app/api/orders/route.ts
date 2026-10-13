import { assertCheckoutOpen } from "@/lib/config";
import { claimSchema } from "@/lib/validation";
import { api, assertOrigin, readJson, json } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { hashToken } from "@/lib/security/crypto";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { rpc } from "@/db/client";
export async function POST(request: Request) {
  return api(async () => {
    assertCheckoutOpen();
    assertOrigin(request);
    const input = await readJson(request, claimSchema);
    await rateLimit(request, "claim", 5);
    await rateLimit(
      request,
      "claim-session",
      5,
      60,
      hashToken(input.quoteToken),
    );
    await verifyTurnstile(input.turnstileToken, request);
    const fingerprint = hashToken(
      JSON.stringify([
        input.customerName,
        input.customerEmail,
        input.bkashSender,
        input.whatsapp ?? "",
        input.trxId,
      ]),
    );
    const order = await rpc<{ orderCode: string; status: string }>(
      "ai_submit_order",
      {
        p_token_hash: hashToken(input.quoteToken),
        p_customer_name: input.customerName,
        p_customer_email: input.customerEmail,
        p_bkash_sender: input.bkashSender,
        p_whatsapp: input.whatsapp ?? "",
        p_trx_id: input.trxId,
        p_fingerprint: fingerprint,
      },
    );
    return json({ order, accessKey: input.quoteToken }, 201);
  });
}
