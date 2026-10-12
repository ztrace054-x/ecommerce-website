import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowIcon } from "@/components/icons";

export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <article className="container prose-page">
      <Link className="back-link" href="/"><ArrowIcon /> হোমে ফিরুন</Link>
      <p className="eyebrow">নীতি ও সহায়তা</p>
      <h1>{title}</h1>
      <p className="page-intro">{intro}</p>
      <div className="notice">খসড়া নীতি · বাস্তব সেবা চালুর আগে চূড়ান্ত নিয়ম প্রকাশ করা হবে।</div>
      <div className="prose-content">{children}</div>
      <div className="policy-help">কিছু জানতে চান? <Link href="/contact">যোগাযোগের তথ্য দেখুন</Link></div>
    </article>
  );
}
