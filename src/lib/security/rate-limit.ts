import "server-only";
import { rpc } from "../../db/client.ts";
import { hashToken } from "./crypto.ts";
import { AppError } from "../errors.ts";

export function clientBucket(request: Request) {
  // No proxy header is trusted by default. Unknown clients share a conservative bucket.
  // Set only a header your host strips and overwrites on EVERY request.
  const trusted = process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (trusted && ["cf-connecting-ip", "x-real-ip"].includes(trusted)) {
    const value = request.headers.get(trusted)?.trim();
    if (value && /^[0-9a-f:.]{3,45}$/i.test(value)) return value;
  }
  return "shared-public";
}
export async function rateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds = 60,
  identity?: string,
) {
  const key = hashToken(`${scope}:${identity ?? clientBucket(request)}`);
  const allowed = await rpc<boolean>("ai_take_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (!allowed)
    throw new AppError(
      429,
      "rate_limited",
      "অনেকবার চেষ্টা হয়েছে। একটু পরে আবার চেষ্টা করুন।",
    );
}
