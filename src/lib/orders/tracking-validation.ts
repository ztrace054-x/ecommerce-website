import { z } from "zod";
import { ORDER_ALPHABET } from "./security.ts";
export const orderCodeSchema = z.string().max(64).trim().toUpperCase().regex(new RegExp(`^ORD-[${ORDER_ALPHABET}]{8}$`));
export const last4Schema = z.string().regex(/^\d{4}$/);
export const trackingSchema = z.object({ orderCode: orderCodeSchema, last4: last4Schema, turnstileToken: z.string().min(1).max(2048) }).strict();
