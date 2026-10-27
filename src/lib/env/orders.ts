import "server-only";
import { z } from "zod";
const origin = z.string().url().refine(value => {
  try { const url = new URL(value); return url.origin === value && !url.username && !url.password; } catch { return false; }
});
const schema = z.object({
  DATABASE_URL: z.string().url().refine(v => { try { return ["postgres:", "postgresql:"].includes(new URL(v).protocol); } catch { return false; } }),
  IP_HASH_SECRET: z.string().trim().min(32),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  SITE_ORIGIN: origin,
  ALLOWED_ORIGINS: z.string().optional().transform(v => v ? v.split(",").map(s => s.trim()) : []).pipe(z.array(origin)),
  TRUSTED_PROXY_MODE: z.enum(["local", "vercel"]).default("vercel"),
  ADMIN_WHATSAPP_NUMBER: z.string().regex(/^8801\d{9}$/),
  BKASH_RECIPIENT_NUMBER: z.string().regex(/^01\d{9}$/),
});
export type OrderEnv = z.infer<typeof schema>;
export function loadOrderEnv(): OrderEnv {
  if (process.env.VERCEL && process.env.LOCAL_ORDER_SMOKE === "1") throw new Error("Local smoke mode is forbidden on Vercel.");
  const result = schema.safeParse(process.env);
  if (!result.success) throw new Error("Order service configuration is missing or invalid.");
  const config = result.data;
  config.ALLOWED_ORIGINS = [...new Set([config.SITE_ORIGIN, ...config.ALLOWED_ORIGINS])];
  if (process.env.NODE_ENV === "production" && (config.TRUSTED_PROXY_MODE === "local" || config.ALLOWED_ORIGINS.some(v => !v.startsWith("https://"))) && process.env.LOCAL_ORDER_SMOKE !== "1") {
    throw new Error("Production requires HTTPS and a trusted deployment proxy.");
  }
  // LOCAL_ORDER_SMOKE only permits loopback configuration, never a deployed bypass.
  if (process.env.LOCAL_ORDER_SMOKE === "1" && (config.TRUSTED_PROXY_MODE !== "local" || !["127.0.0.1", "localhost"].includes(new URL(config.DATABASE_URL).hostname) || config.ALLOWED_ORIGINS.some(v => !["127.0.0.1", "localhost"].includes(new URL(v).hostname)))) {
    throw new Error("Local smoke configuration must be loopback only.");
  }
  if (process.env.NODE_ENV === "production" && process.env.LOCAL_ORDER_SMOKE !== "1" && (config.TURNSTILE_SECRET_KEY.startsWith("1x") || config.TURNSTILE_SECRET_KEY.startsWith("2x") || config.TURNSTILE_SECRET_KEY.startsWith("3x"))) {
    throw new Error("Turnstile test keys are not permitted in production.");
  }
  if (process.env.NODE_ENV === "production" && process.env.LOCAL_ORDER_SMOKE !== "1" && (!/^8801[3-9]\d{8}$/.test(config.ADMIN_WHATSAPP_NUMBER) || !/^01[3-9]\d{8}$/.test(config.BKASH_RECIPIENT_NUMBER))) {
    throw new Error("Production payment and contact configuration is invalid.");
  }
  return config;
}
