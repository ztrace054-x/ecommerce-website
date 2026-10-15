import "server-only";
import { databaseConfig } from "../lib/config.ts";
import { AppError } from "../lib/errors.ts";

export async function databaseRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const config = databaseConfig();
  if (!config)
    throw new AppError(
      503,
      "database_unavailable",
      "সেবাটি এখন চালু করা যায়নি। পরে চেষ্টা করুন।",
    );
  let response: Response;
  try {
    response = await fetch(`${config.url}/rest/v1/${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new AppError(
      503,
      "database_unavailable",
      "সেবাটি এখন চালু করা যায়নি। পরে চেষ্টা করুন।",
    );
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    if (data.code === "23505") {
      const message = data.message?.includes("orders_trx_id_unique")
        ? "এই TrxID দিয়ে আগে পেমেন্ট দাবি জমা হয়েছে।"
        : data.message?.includes("products_storefront_slug_unique")
          ? "এই সেবার URL slug আগে ব্যবহার হয়েছে।"
          : "একই তথ্য আগে সংরক্ষণ হয়েছে। তথ্য যাচাই করুন।";
      throw new AppError(409, "duplicate", message);
    }
    const mapped: Record<string, [number, string]> = {
      quote_expired: [
        409,
        "পেমেন্ট নির্দেশনার মেয়াদ শেষ হয়েছে। সহায়তায় যোগাযোগ করুন।",
      ],
      quote_invalid: [404, "পেমেন্ট নির্দেশনা পাওয়া যায়নি।"],
      product_unavailable: [409, "সেবাটি এখন অর্ডার করা যাবে না।"],
      claim_conflict: [409, "এই অর্ডারের তথ্য আগে জমা হয়েছে।"],
      stale_order: [409, "অর্ডারটি পরিবর্তিত হয়েছে। আবার খুলে দেখুন।"],
      invalid_transition: [409, "এই অবস্থায় অর্ডারটি পরিবর্তন করা যাবে না।"],
      amount_mismatch: [422, "পেমেন্টের পরিমাণ অর্ডারের সঙ্গে মিলছে না।"],
      forbidden: [403, "এই কাজের অনুমতি নেই।"],
      not_found: [404, "অর্ডারটি পাওয়া যায়নি।"],
    };
    const match = data.message && mapped[data.message];
    if (match) throw new AppError(match[0], data.message!, match[1]);
    throw new AppError(
      503,
      "database_unavailable",
      "সেবাটি এখন চালু করা যায়নি। পরে চেষ্টা করুন।",
    );
  }
  return response.json() as Promise<T>;
}
export function rpc<T>(name: string, args: Record<string, unknown>) {
  return databaseRequest<T>(`rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}
