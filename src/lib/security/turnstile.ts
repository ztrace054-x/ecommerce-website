import "server-only";
import { applicationOrigin } from "../config.ts";
import { AppError } from "../errors.ts";

export async function verifyTurnstile(token: string, request: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret)
    throw new AppError(
      503,
      "bot_unavailable",
      "নিরাপত্তা যাচাই এখন চালু করা যায়নি।",
    );
  let result: { success?: boolean; hostname?: string; action?: string };
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("unavailable");
    result = (await response.json()) as typeof result;
  } catch {
    throw new AppError(
      503,
      "bot_unavailable",
      "নিরাপত্তা যাচাই এখন চালু করা যায়নি।",
    );
  }
  if (
    !result.success ||
    result.action !== "payment_claim" ||
    result.hostname !== new URL(applicationOrigin(request)).hostname
  ) {
    throw new AppError(
      422,
      "bot_rejected",
      "নিরাপত্তা যাচাই আবার সম্পন্ন করুন।",
    );
  }
}
