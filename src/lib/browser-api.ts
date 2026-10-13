export async function browserApi<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.error?.message ?? "কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।",
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।";
