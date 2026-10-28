import "server-only";
import { z } from "zod";
import type { OrderEnv } from "../env/orders.ts";
import type { OrderStore } from "./store.ts";
import { readJsonRequest } from "./request.ts";
import { errorResponse } from "./responses.ts";
import { verifyTurnstile } from "./handler.ts";
import { getClientIp, hashIp } from "./security.ts";
import { orderCodeSchema, trackingSchema } from "./tracking-validation.ts";
export const TRACK_NOT_FOUND = "Order not found. Check your order code and the last 4 digits.";
export function createTrackingHandler(config: OrderEnv, store: OrderStore, captcha = verifyTurnstile) {
  return async (request: Request) => {
    try {
      const boundary = await readJsonRequest(request, config.ALLOWED_ORIGINS);
      if (boundary instanceof Response) return boundary;
      const ipHash = hashIp(getClientIp(request, config.TRUSTED_PROXY_MODE), config.IP_HASH_SECRET);
      const rateKey = hashIp(`tracking-ip:${ipHash}`, config.IP_HASH_SECRET);
      const retry = await store.rateLimit(rateKey, { short: 10, day: Infinity });
      if (retry) { await store.tracking.audit(null, ipHash, "ip_limited"); return errorResponse(429, "RATE_LIMIT", "Too many attempts. Try again later.", { "Retry-After": String(retry) }); }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(boundary.chunks).toString("utf8")); }
      catch { await store.tracking.audit(null, ipHash, "invalid"); return errorResponse(400, "VALIDATION", "Invalid JSON."); }
      const codeOnly = z.object({ orderCode: orderCodeSchema }).safeParse(body);
      const codeHash = codeOnly.success ? hashIp(`tracking-code:${codeOnly.data.orderCode}`, config.IP_HASH_SECRET) : null;
      const locked = codeHash ? await store.tracking.retryAfter(codeHash) : 0;
      if (locked) { await store.tracking.audit(codeHash, ipHash, "locked"); return errorResponse(429, "RATE_LIMIT", "Too many attempts. Try again later.", { "Retry-After": String(locked) }); }
      const token = z.object({ turnstileToken: z.string().min(1).max(2048) }).safeParse(body);
      if (!token.success || !await captcha(token.data.turnstileToken, config, boundary.origin, "track")) {
        await store.tracking.audit(codeHash, ipHash, "captcha_failed"); return errorResponse(403, "CAPTCHA", "Verification failed.");
      }
      const parsed = trackingSchema.safeParse(body);
      if (!parsed.success || !codeHash) { await store.tracking.audit(codeHash, ipHash, "invalid"); return errorResponse(400, "VALIDATION", "Check the order code and last 4 digits."); }
      const result = await store.tracking.attempt(parsed.data.orderCode, parsed.data.last4, codeHash, ipHash);
      if (result.retryAfter) return errorResponse(429, "RATE_LIMIT", "Too many attempts. Try again later.", { "Retry-After": String(result.retryAfter) });
      if (!result.view) return errorResponse(404, "NOT_FOUND", TRACK_NOT_FOUND);
      return Response.json(result.view, { headers: { "Cache-Control": "no-store" } });
    } catch { return errorResponse(500, "INTERNAL", "Unable to look up order. Please try later."); }
  };
}
