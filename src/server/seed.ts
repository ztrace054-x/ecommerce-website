import "server-only";
import { z } from "zod";
import { products } from "../db/schema.ts";
import { productInputSchema } from "./validators.ts";
import type { Database } from "./database/connection.ts";
import { DataAccessError } from "./database/errors.ts";

export const demoProducts = z.array(productInputSchema).parse([
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "AI সেটআপ সহায়তা",
    description: "নিজের অ্যাকাউন্টে AI টুল ব্যবহার শুরু করার সহজ গাইড। টুলের পরিচিতি, ব্যবহার শেখানো ও নিরাপদ ব্যবহারের পরামর্শ। এটি নমুনা সেবা; কোনো সাবস্ক্রিপশন দেওয়া হচ্ছে না।",
    priceBdt: 500, deliveryType: "C", isActive: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "প্রম্পট শেখার সেশন",
    description: "AI-কে পরিষ্কার নির্দেশনা দিয়ে ভালো উত্তর পাওয়ার কৌশল শিখুন। পড়াশোনা ও কাজের নমুনা অনুশীলন এবং AI-এর উত্তর যাচাই করার গাইড। এটি নমুনা প্রশিক্ষণ সেবা।",
    priceBdt: 750, deliveryType: "C", isActive: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "অফিশিয়াল আমন্ত্রণের নমুনা — নিষ্ক্রিয়",
    description: "শুধু অনুমোদিত প্ল্যাটফর্মের নিয়ম মেনে নিজের ইমেইলে অফিশিয়াল আমন্ত্রণ। কোনো নির্দিষ্ট প্ল্যাটফর্ম বা বিক্রির অনুমতি নিশ্চিত করা হয়নি; এটি চালু অফার নয়।",
    priceBdt: 1500, deliveryType: "A", isActive: false,
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    name: "অফিশিয়াল ভাউচারের নমুনা — নিষ্ক্রিয়",
    description: "অফিশিয়াল উৎস বা অনুমোদিত বিক্রেতার ভাউচারের ডেটাবেস নমুনা। অঞ্চল ও বিক্রির অনুমতি নিশ্চিত করা হয়নি; কোনো ভাউচার কোড মজুত বা বিক্রি করা হচ্ছে না।",
    priceBdt: 2000, deliveryType: "B", isActive: false,
  },
]);

/** Idempotent, non-destructive: never overwrite an edited product or price. */
export async function seedDemoProducts(db: Database): Promise<number> {
  try {
    const inserted = await db.insert(products).values(demoProducts)
      .onConflictDoNothing({ target: products.id }).returning({ id: products.id });
    return inserted.length;
  } catch {
    throw new DataAccessError("Demo products could not be inserted.");
  }
}
