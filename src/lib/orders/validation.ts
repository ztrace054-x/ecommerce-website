import { z } from "zod";
import { normalizeBdPhone, normalizeTrxId, TRX_ID_PATTERN } from "./security.ts";
const phone = z.string().max(20).transform((value, ctx) => {
  try { return normalizeBdPhone(value); } catch { ctx.addIssue({ code: "custom", message: "Invalid Bangladesh phone number." }); return z.NEVER; }
});
export const orderSchema = z.object({
  productId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(80).regex(/^[^\p{Cc}<>]*$/u),
  customerEmail: z.string().trim().max(254).email().transform(v => v.toLowerCase()),
  whatsapp: phone.optional(),
  senderBkashNumber: phone,
  trxId: z.string().max(64).transform(normalizeTrxId).pipe(z.string().regex(TRX_ID_PATTERN)),
  turnstileToken: z.string().min(1).max(2048),
}).strict();
export type OrderInput = z.infer<typeof orderSchema>;
