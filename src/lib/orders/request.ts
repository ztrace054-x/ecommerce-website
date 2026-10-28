import "server-only";
import { errorResponse } from "./responses.ts";
const BODY_LIMIT = 10 * 1024;
/** Shared origin/type/stream-size boundary; never reads or logs personal fields. */
export async function readJsonRequest(request: Request, allowedOrigins: string[]) {
      const originHeader = request.headers.get("origin");
      let origin: string;
      try { origin = originHeader ?? new URL(request.headers.get("referer") ?? "").origin; }
      catch { return errorResponse(403, "ORIGIN", "Request not permitted."); }
      if (!allowedOrigins.includes(origin)) return errorResponse(403, "ORIGIN", "Request not permitted.");
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) return errorResponse(415, "CONTENT_TYPE", "JSON required.");
      const declaredLength = request.headers.get("content-length");
      if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > BODY_LIMIT)) return errorResponse(413, "BODY_SIZE", "Request too large.");
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > BODY_LIMIT) { await reader.cancel(); return errorResponse(413, "BODY_SIZE", "Request too large."); }
          chunks.push(value);
        }
      }
      return { origin, chunks };
}
