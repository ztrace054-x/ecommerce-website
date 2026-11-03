import "server-only";
import { isIP } from "node:net";
import { loadOrderEnv } from "../env/orders.ts";
export function loadAdminEnv() {
  const base = loadOrderEnv();
  const key = process.env.ADMIN_SECRET_KEY ?? "";
  const prefix = process.env.ADMIN_PATH_PREFIX ?? (process.env.NODE_ENV === "production" ? "" : "/manage-x7");
  const ips = (process.env.ADMIN_IP_ALLOWLIST ?? "").split(",").map(v => v.trim()).filter(Boolean);
  if (!/^[A-Za-z0-9+/]{43}=$/.test(key) || Buffer.from(key, "base64").length !== 32 || !/^\/[a-z][a-z0-9-]{5,63}$/.test(prefix) || ips.some(ip => !isIP(ip))) throw new Error("Admin configuration missing or invalid.");
  return { ...base, ADMIN_SECRET_KEY: key, ADMIN_PATH_PREFIX: prefix, ADMIN_IP_ALLOWLIST: ips };
}
export type AdminEnv = ReturnType<typeof loadAdminEnv>;
