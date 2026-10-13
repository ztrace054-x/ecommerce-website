/** Phase 1 samples only. Never use these prices to accept a real payment. */
export type MockProduct = Readonly<{
  slug: string;
  name: string;
  category: string;
  description: string;
  pricePoisha: number;
  unit: string;
  icon: "setup" | "prompt" | "chatbot" | "website";
  includes: readonly string[];
  deliveryNote: string;
}>;

export const mockProducts: readonly MockProduct[] = [
  {
    slug: "ai-setup",
    name: "AI সেটআপ সহায়তা",
    category: "সেটআপ",
    description: "নিজের অ্যাকাউন্টে AI টুল ব্যবহার শুরু করার সহজ গাইড।",
    pricePoisha: 50000,
    unit: "একটি সেশন",
    icon: "setup",
    includes: [
      "বেসিক টুলের পরিচিতি",
      "আপনার প্রয়োজন অনুযায়ী ব্যবহার শেখানো",
      "নিরাপদ ব্যবহারের পরামর্শ",
    ],
    deliveryNote: "আপনি নিজের অ্যাকাউন্ট ব্যবহার করবেন। কোনো পাসওয়ার্ড দিতে হবে না।",
  },
  {
    slug: "prompt-training",
    name: "প্রম্পট শেখার সেশন",
    category: "প্রশিক্ষণ",
    description: "AI-কে পরিষ্কার নির্দেশনা দিয়ে ভালো উত্তর পাওয়ার কৌশল শিখুন।",
    pricePoisha: 75000,
    unit: "একটি সেশন",
    icon: "prompt",
    includes: [
      "সহজ প্রম্পট লেখার নিয়ম",
      "পড়াশোনা ও কাজের নমুনা অনুশীলন",
      "AI-এর উত্তর যাচাই করার গাইড",
    ],
    deliveryNote: "এটি শেখার সেবা। কোনো AI সাবস্ক্রিপশন বা অ্যাকাউন্ট বিক্রি করা হচ্ছে না।",
  },
  {
    slug: "chatbot-building",
    name: "চ্যাটবট তৈরি",
    category: "চ্যাটবট",
    description: "আপনার কাজের সাধারণ প্রশ্নের জন্য একটি ছোট চ্যাটবটের নমুনা।",
    pricePoisha: 300000,
    unit: "একটি প্রাথমিক সেটআপ",
    icon: "chatbot",
    includes: [
      "প্রয়োজন ও প্রশ্নের তালিকা সাজানো",
      "বেসিক চ্যাটবট তৈরি",
      "নমুনা দিয়ে ব্যবহার পরীক্ষা",
    ],
    deliveryNote: "কাজের পরিধি, সময় ও প্রয়োজনীয় টুল আগে আলোচনা করে ঠিক করা হবে।",
  },
  {
    slug: "website-building",
    name: "ওয়েবসাইট তৈরি",
    category: "ওয়েবসাইট",
    description: "আপনার পরিচিতি বা কাজ তুলে ধরার জন্য একটি সহজ ওয়েবসাইট।",
    pricePoisha: 500000,
    unit: "একটি ছোট ওয়েবসাইট",
    icon: "website",
    includes: [
      "একটি ছোট তথ্যভিত্তিক ওয়েবসাইট",
      "মোবাইলে ব্যবহার উপযোগী পেজ",
      "বেসিক কনটেন্ট সাজানো",
    ],
    deliveryNote: "কাজের পরিধি ও সময় আগে ঠিক করা হবে। ডোমেইন বা হোস্টিং এই নমুনা মূল্যের অংশ নয়।",
  },
];

export function getMockProduct(slug: string): MockProduct | undefined {
  return mockProducts.find((product) => product.slug === slug);
}
