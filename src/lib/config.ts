import "server-only";
import { AppError } from "./errors.ts";

function configuredUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    throw new AppError(503, "configuration", "সেবাটি এখন চালু করা যায়নি।");
  }
}

export function databaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key)
    throw new AppError(503, "configuration", "সেবাটি এখন চালু করা যায়নি।");
  const parsed = configuredUrl(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new AppError(503, "configuration", "সেবাটি এখন চালু করা যায়নি।");
  }
  return { url: parsed.origin, key };
}
export function applicationOrigin(request?: Request): string {
  const url = process.env.APP_URL?.trim();
  if (url) {
    const parsed = configuredUrl(url);
    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/" ||
      (parsed.protocol !== "https:" &&
        !(
          parsed.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(parsed.hostname)
        ))
    ) {
      throw new AppError(503, "configuration", "সেবাটি এখন চালু করা যায়নি।");
    }
    return parsed.origin;
  }
  if (process.env.NODE_ENV !== "production" && request)
    return new URL(request.url).origin;
  throw new AppError(503, "configuration", "সেবাটি এখন চালু করা যায়নি।");
}
export function checkoutSettings() {
  const enabled = process.env.CHECKOUT_ENABLED === "true";
  const recipient = process.env.BKASH_RECIPIENT_NUMBER?.trim() ?? "";
  const paymentMethod = process.env.BKASH_PAYMENT_METHOD?.trim() ?? "";
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  let ready: boolean;
  try {
    ready =
      enabled &&
      Boolean(databaseConfig()) &&
      /^01[3-9][0-9]{8}$/.test(recipient) &&
      ["payment", "send_money"].includes(paymentMethod) &&
      Boolean(siteKey) &&
      Boolean(process.env.TURNSTILE_SECRET_KEY?.trim()) &&
      Boolean(applicationOrigin()) &&
      process.env.POLICIES_APPROVED === "true" &&
      process.env.CATALOG_APPROVED === "true";
  } catch {
    ready = false;
  }
  return {
    ordersOpen: ready,
    siteKey: ready ? siteKey : "",
    recipient: ready ? recipient : "",
    paymentMethod,
  };
}
export function assertCheckoutOpen() {
  const settings = checkoutSettings();
  if (!settings.ordersOpen)
    throw new AppError(
      503,
      "checkout_closed",
      "অর্ডার এখন বন্ধ। কোনো টাকা পাঠাবেন না।",
    );
  return settings;
}
