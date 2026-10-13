import { api, json } from "@/lib/security/http";
import { requireAdmin } from "@/lib/auth/admin";
export async function GET(request: Request) {
  return api(async () => json({ admin: await requireAdmin(request) }));
}
