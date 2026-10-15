import { z } from "zod";

const plainText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (value) =>
        [...value].every((character) => {
          const code = character.codePointAt(0)!;
          return (
            character !== "<" &&
            character !== ">" &&
            code !== 127 &&
            (code > 31 || [9, 10, 13].includes(code))
          );
        }),
      "সঠিক তথ্য দিন।",
    )
    .transform((value) => value.normalize("NFC"));
export const emailField = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((value) => value.toLowerCase());
export const bangladeshPhone = z
  .string()
  .trim()
  .transform((value) => value.replace(/^\+?880/, "0"))
  .pipe(z.string().regex(/^01[3-9][0-9]{8}$/));
const whatsapp = z
  .string()
  .trim()
  .max(16)
  .transform((value) =>
    /^01[3-9][0-9]{8}$/.test(value) ? `+88${value}` : value && !value.startsWith("+") ? `+${value}` : value,
  )
  .pipe(z.string().regex(/^\+?[1-9][0-9]{7,14}$|^$/))
  .optional();
// Syntax checks only. A matching string is never evidence of payment.
export const trxIdField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{10}$/);
export const codeField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^ORD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
export const tokenField = z.string().regex(/^[a-f0-9]{64}$/);
const uuid = z.string().uuid();
export const quoteSchema = z.object({ productId: uuid }).strict();
export const claimSchema = z
  .object({
    quoteToken: tokenField,
    customerName: plainText(2, 100),
    customerEmail: emailField,
    bkashSender: bangladeshPhone,
    whatsapp,
    trxId: trxIdField,
    turnstileToken: z.string().min(1).max(2048),
    acceptedTerms: z.literal(true),
  })
  .strict();
export const trackingSchema = z
  .object({
    orderCode: codeField,
    customerEmail: emailField,
    accessKey: tokenField,
  })
  .strict();
export const transactionSchema = z.object({ trxId: trxIdField }).strict();
export const loginSchema = z
  .object({ email: emailField, password: z.string().min(1).max(128), mfaCode: z.string().regex(/^[0-9]{6}$/) })
  .strict();
export const statusSchema = z
  .object({
    status: z.enum(["verified", "rejected", "delivered"]),
    expectedVersion: z.number().int().min(1),
    note: plainText(1, 2000),
    customerMessage: plainText(0, 1000).default(""),
    verifiedAmountPoisha: z.number().int().positive().max(100000000).optional(),
    checkedPayment: z.boolean().optional(),
    completedDelivery: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.status === "verified" &&
      (!value.verifiedAmountPoisha || value.checkedPayment !== true)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkedPayment"],
        message: "পেমেন্ট নিজে যাচাই করুন।",
      });
    }
    if (value.status === "rejected" && value.customerMessage.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerMessage"],
        message: "গ্রাহকের জন্য কারণ লিখুন।",
      });
    }
    if (value.status === "delivered" && value.completedDelivery !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completedDelivery"],
        message: "ডেলিভারি নিশ্চিত করুন।",
      });
    }
  });
export const noteSchema = z.object({ note: plainText(1, 2000) }).strict();
export const productSlugSchema = z.string().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const productSchema = z
  .object({
    slug: productSlugSchema,
    name: plainText(2, 100),
    description: plainText(10, 2000),
    category: plainText(2, 50),
    pricePoisha: z.number().int().positive().max(100000000).multipleOf(100),
    unit: plainText(2, 100),
    duration: plainText(2, 150),
    icon: z.enum(["setup", "prompt", "chatbot", "website"]),
    includes: z.array(plainText(2, 200)).min(1).max(12),
    deliveryType: z.literal("service"),
    deliveryMethod: plainText(2, 150),
    deliveryNote: plainText(2, 1000),
    terms: plainText(10, 2000),
    active: z.boolean(),
  })
  .strict();
export const idSchema = uuid;
