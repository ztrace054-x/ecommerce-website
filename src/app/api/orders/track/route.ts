import { orderRuntime } from "../../../../lib/orders/runtime.ts";
import { createTrackingHandler } from "../../../../lib/orders/tracking-handler.ts";
import { errorResponse } from "../../../../lib/orders/responses.ts";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try { const { config, store } = orderRuntime(); return await createTrackingHandler(config, store)(request); }
  catch { return errorResponse(500, "INTERNAL", "Order service unavailable."); }
}
function methodNotAllowed() { return errorResponse(405, "METHOD", "Method not allowed.", { Allow: "POST" }); }
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
