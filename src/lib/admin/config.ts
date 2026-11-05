import "server-only";
import { isIP } from "node:net";
import { z } from "zod";
import { loadOrderEnv } from "../env/orders.ts";
const zEmail=(value:string)=>z.string().email().safeParse(value).success;
export function loadAdminEnv() {
  const base = loadOrderEnv();
  const key = process.env.ADMIN_SECRET_KEY ?? "";
  const prefix = process.env.ADMIN_PATH_PREFIX ?? (process.env.NODE_ENV === "production" ? "" : "/manage-x7");
  const deliveryKey = process.env.DELIVERY_CODE_KEY ?? "";
  const emailFrom = process.env.EMAIL_FROM ?? "";
  const emailMode = process.env.EMAIL_MODE ?? "log-safe";
  const ips = (process.env.ADMIN_IP_ALLOWLIST ?? "").split(",").map(v => v.trim()).filter(Boolean);
  if (!/^[A-Za-z0-9+/]{43}=$/.test(key) || Buffer.from(key, "base64").length !== 32 || !/^[A-Za-z0-9+/]{43}=$/.test(deliveryKey) || Buffer.from(deliveryKey, "base64").length !== 32 || !/^\/[a-z][a-z0-9-]{5,63}$/.test(prefix) || ips.some(ip => !isIP(ip)) || !["resend","log-safe"].includes(emailMode) || (emailFrom && !zEmail(emailFrom))) throw new Error("Admin configuration missing or invalid.");
  if(process.env.NODE_ENV==="production"&&(!emailFrom||!process.env.DELIVERY_CODE_KEY))throw new Error("Delivery configuration missing or invalid.");
  return { ...base, ADMIN_SECRET_KEY: key, ADMIN_PATH_PREFIX: prefix, ADMIN_IP_ALLOWLIST: ips, DELIVERY_CODE_KEY: deliveryKey, EMAIL_FROM: emailFrom, EMAIL_MODE: emailMode as "resend"|"log-safe", RESEND_API_KEY: process.env.RESEND_API_KEY??"" };
}
export type AdminEnv = ReturnType<typeof loadAdminEnv>;
