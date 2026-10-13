import "server-only";
import { mockProducts } from "../data/mock-products.ts";
import { databaseConfig } from "./config.ts";
import { rpc } from "../db/client.ts";
import type { Product } from "./domain.ts";
import { productPresentation } from "./product-presentation.ts";

export const sampleCatalog: Product[] = mockProducts.map((p, i) => ({
  ...p,
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  includes: [...p.includes],
  duration: "সময় ও কাজের পরিধি আগে আলোচনা করা হবে",
  deliveryType: "service",
  deliveryMethod: "অনলাইন সেশন / ইমেইল",
  terms: "এটি নমুনা সেবা। কাজের পরিধি, মূল্য ও ডেলিভারি আগে নিশ্চিত করতে হবে।",
  active: false,
}));
export async function catalog(): Promise<{products:Product[];sample:boolean}> {
 if(!databaseConfig()) {
  // Preserve the Phase 2 Node/Compose catalog workflow. Workers use HTTP only.
  if(process.env.DATABASE_URL?.trim()) {
   const {listActiveProducts}=await import("../server/catalog.ts");
   const rows=await listActiveProducts();
   const products:Product[]=rows.filter(p=>p.deliveryType==="C").map(p=>({
    id:p.id,slug:p.id,name:p.name,description:p.description,pricePoisha:p.priceBdt*100,
    ...productPresentation(p),includes:[...productPresentation(p).includes],
    duration:"সময় ও কাজের পরিধি আগে আলোচনা করা হবে",deliveryType:"service",
    deliveryMethod:"অনলাইন সেশন / ইমেইল",terms:"এটি নমুনা সেবা। কাজের পরিধি, মূল্য ও ডেলিভারি আগে নিশ্চিত করতে হবে।",active:true,
   }));
   return {products,sample:true};
  }
  return {products:sampleCatalog,sample:true};
 }
 const products=await rpc<Product[]>("ai_catalog",{});
 return {products,sample:process.env.CATALOG_APPROVED!=="true"};
}
