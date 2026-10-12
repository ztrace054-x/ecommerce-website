import "server-only";
import { z } from "zod";

const noControls = (value: string) => [...value].every((character) => {
  const code = character.charCodeAt(0);
  return code >= 32 && code !== 127;
});
export const idSchema = z.uuid();
export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const nameSchema = z.string().trim().min(2).max(100).refine(noControls, "Control characters are not allowed.");
export const senderNumberSchema = z.string().trim().regex(/^01[3-9][0-9]{8}$/u);

export const whatsappSchema = z.string().trim().max(16)
  .transform((value) => value === "" ? null : /^01[3-9][0-9]{8}$/u.test(value) ? `+88${value}` : value)
  .pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/u).nullable());

export const createOrderSchema = z.strictObject({
  productId: idSchema,
  customerName: nameSchema,
  customerEmail: emailSchema,
  senderBkashNumber: senderNumberSchema,
  whatsapp: whatsappSchema.nullable().optional().transform((value) => value ?? null),
});

/** Normalization is separate from validation; punctuation is never silently removed. */
export function normalizeTrxId(value: string): string {
  return z.string().parse(value).trim().toUpperCase();
}

export const trxIdSchema = z.string().max(64).transform(normalizeTrxId)
  .pipe(z.string().regex(/^[A-Z0-9]{10}$/u));
export const orderCodeSchema = z.string().regex(/^ORD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/u);
export const paymentClaimSchema = z.strictObject({ orderId: idSchema, trxId: trxIdSchema });

export const productInputSchema = z.strictObject({
  id: idSchema,
  name: z.string().trim().min(2).max(160).refine(noControls),
  description: z.string().trim().min(2).max(4000)
    .refine((value) => [...value].every((character) => {
      const code = character.charCodeAt(0);
      return (code >= 32 && code !== 127) || [9, 10, 13].includes(code);
    })),
  priceBdt: z.number().int().min(1).max(2_147_483_647),
  deliveryType: z.enum(["A", "B", "C"]),
  isActive: z.boolean(),
});

export const passwordSchema = z.string().min(15).max(128)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 512 && !value.includes("\0"));
export const adminCreationSchema = z.strictObject({ email: emailSchema, password: passwordSchema });

// These are storage contracts, not authorization or exposed mutation endpoints.
export const deliveryCodeInputSchema = z.strictObject({
  productId: idSchema, code: z.string().min(1).max(4096),
});
export const auditInputSchema = z.strictObject({
  adminId: idSchema,
  action: z.string().regex(/^[a-z][a-z0-9_.]{0,79}$/u),
  orderId: idSchema.nullable(),
  ip: z.union([z.ipv4(), z.ipv6()]),
});
