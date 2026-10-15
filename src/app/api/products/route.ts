import { catalog } from "@/lib/catalog";
import { api, json } from "@/lib/security/http";
export async function GET() {
  return api(async () => json(await catalog()));
}
