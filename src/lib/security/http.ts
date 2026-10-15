import "server-only";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { applicationOrigin } from "../config.ts";
import { AppError } from "../errors.ts";

export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== applicationOrigin(request) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new AppError(403, "origin_rejected", "এই অনুরোধের অনুমতি নেই।");
  }
}
export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = 16384,
): Promise<T> {
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim() !==
    "application/json"
  ) {
    throw new AppError(415, "content_type", "সঠিক অনুরোধ পাঠান।");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "invalid_json", "সঠিক তথ্য দিন।");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maxBytes) {
      await reader.cancel();
      throw new AppError(413, "body_too_large", "অনুরোধটি খুব বড়।");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new AppError(400, "invalid_json", "সঠিক তথ্য দিন।");
  }
  return schema.parse(data);
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
export async function api(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ZodError)
      return json(
        {
          error: {
            code: "validation",
            message: "প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন।",
            fields: [
              ...new Set(
                error.issues.map((issue) => issue.path[0]).filter(Boolean),
              ),
            ],
          },
        },
        422,
      );
    if (error instanceof AppError) {
      const response = json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
      if (error.status === 429) response.headers.set("Retry-After", "60");
      return response;
    }
    // Never log raw requests, upstream errors, credentials or customer information.
    return json(
      {
        error: {
          code: "internal",
          message: "কাজটি সম্পন্ন হয়নি। পরে চেষ্টা করুন।",
        },
      },
      500,
    );
  }
}
