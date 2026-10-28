import { readJsonRequest } from "./request.ts";
import { errorResponse } from "./responses.ts";
export { errorResponse } from "./responses.ts";
import "server-only";
import { z } from "zod";
import type { OrderEnv } from "../env/orders.ts";
import { getClientIp, hashIp } from "./security.ts";
import { orderSchema } from "./validation.ts";
import { OrderConflict, ProductUnavailable, type OrderStore } from "./store.ts";

const captchaResponse = z.object({ success: z.boolean(), hostname: z.string().optional(), action: z.string().optional() });
export async function verifyTurnstile(token: string, config: OrderEnv, origin: string, action = "order") {
  try {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: new URLSearchParams({ secret: config.TURNSTILE_SECRET_KEY, response: token }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return false;
  const result = captchaResponse.safeParse(await response.json());
  if (!result.success || !result.data.success) return false;
  const officialTest = /^(1x|2x|3x)/.test(config.TURNSTILE_SECRET_KEY);
  if (officialTest && process.env.NODE_ENV !== "production") return true;
  if (officialTest && process.env.LOCAL_ORDER_SMOKE === "1") return true;
  return result.data.hostname === new URL(origin).hostname && result.data.action === action;
  } catch { return false; }
}
export function createOrderHandler(config: OrderEnv, store: OrderStore, captcha = verifyTurnstile) {
  return async (request: Request) => {
    try {
      const boundary = await readJsonRequest(request, config.ALLOWED_ORIGINS);
      if (boundary instanceof Response) return boundary;
      const { origin, chunks } = boundary;
      const ipHash = hashIp(getClientIp(request, config.TRUSTED_PROXY_MODE), config.IP_HASH_SECRET);
      const retry = await store.rateLimit(ipHash);
      if (retry) return errorResponse(429, "RATE_LIMIT", "Too many attempts. Try again later.", { "Retry-After": String(retry) });
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { return errorResponse(400, "VALIDATION", "Invalid JSON."); }
      // Extract only the bounded token before full field validation, per processing order.
      const token = z.object({ turnstileToken: z.string().min(1).max(2048) }).safeParse(body);
      if (!token.success || !await captcha(token.data.turnstileToken, config, origin)) return errorResponse(403, "CAPTCHA", "Verification failed.");
      const parsed = orderSchema.safeParse(body);
      if (!parsed.success) {
        const fields: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0];
          if (typeof field === "string" && field !== "turnstileToken") fields[field] = "Check this field.";
        }
        return Response.json({ error: { code: "VALIDATION", message: "Check the submitted fields.", fields } }, { status: 400, headers: { "Cache-Control": "no-store" } });
      }
      const order = await store.create(parsed.data, ipHash);
      const whatsappLink = `https://wa.me/${config.ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Please manually verify order ${order.orderCode}.`)}`;
      return Response.json({ ...order, whatsappLink }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof OrderConflict) return errorResponse(409, "TRX_CONFLICT", "This TrxID is invalid or has already been used.");
      if (error instanceof ProductUnavailable) return errorResponse(400, "PRODUCT", "Product unavailable.");
      // Deliberately no raw error logging: driver errors may contain submitted PII.
      return errorResponse(500, "INTERNAL", "Unable to submit order. Please try later.");
    }
  };
}
