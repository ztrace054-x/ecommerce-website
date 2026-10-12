import type { CatalogProduct } from "../server/catalog.ts";

/** Presentation for delivery rules only; product names/descriptions/prices live in PostgreSQL. */
const rules = {
  A: {
    category: "অফিশিয়াল আমন্ত্রণ", icon: "setup", unit: "একটি প্ল্যান",
    includes: ["অনুমোদিত অফিশিয়াল আমন্ত্রণ", "গ্রাহকের নিজের ইমেইলে সেবা"],
    deliveryNote: "সংশ্লিষ্ট প্ল্যাটফর্মের নিয়মে অনুমোদিত হলেই নিজের অ্যাকাউন্টে আমন্ত্রণ দেওয়া যাবে। কোনো পাসওয়ার্ড প্রয়োজন নেই।",
  },
  B: {
    category: "অফিশিয়াল ভাউচার", icon: "prompt", unit: "একটি ভাউচার",
    includes: ["অফিশিয়াল বা অনুমোদিত উৎস", "অঞ্চল ও ব্যবহারের নিয়ম আগে নিশ্চিত করা"],
    deliveryNote: "পেমেন্ট যাচাইয়ের পরে অনুমোদিত ভাউচার দেওয়া হবে। এখন কোনো ভাউচার বিক্রি বা ডেলিভারি চালু নেই।",
  },
  C: {
    category: "সেবা", icon: "setup", unit: "একটি নমুনা সেবা",
    includes: ["কাজের পরিধি ও সময় আগে ঠিক করা", "কোনো অ্যাকাউন্টের পাসওয়ার্ড প্রয়োজন নেই"],
    deliveryNote: "এটি একটি সেবা। কোনো তৈরি অ্যাকাউন্ট বা শেয়ার করা লগইন দেওয়া হবে না। কাজের পরিধি ও সময় আগে আলোচনা করে ঠিক করা হবে।",
  },
} as const;

export function productPresentation(product: CatalogProduct) {
  return rules[product.deliveryType];
}
