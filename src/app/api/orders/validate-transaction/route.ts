import { assertCheckoutOpen } from "@/lib/config";
import { transactionSchema } from "@/lib/validation";
import { api, assertOrigin, readJson, json } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
export async function POST(request: Request) {
  return api(async () => {
    assertCheckoutOpen();
    assertOrigin(request);
    await readJson(request, transactionSchema);
    await rateLimit(request, "trx-syntax", 10);
    // Deliberately does not expose whether somebody else's TrxID exists.
    return json({ validFormat: true, paymentVerified: false });
  });
}
