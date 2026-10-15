import { catalogProduct } from "@/lib/catalog";
import { api, json } from "@/lib/security/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return api(async () => json(await catalogProduct((await params).slug)));
}
