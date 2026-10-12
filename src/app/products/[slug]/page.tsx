import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon, CheckIcon, ServiceIcon } from "@/components/icons";
import { getMockProduct, mockProducts } from "@/data/mock-products";
import { formatTaka } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return mockProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getMockProduct((await params).slug);
  return { title: product?.name ?? "সেবাটি পাওয়া যায়নি" };
}

export default async function ProductPage({ params }: Props) {
  const product = getMockProduct((await params).slug);
  if (!product) notFound();

  return (
    <div className="container page-space">
      <Link href="/products" className="back-link"><ArrowIcon /> সব সেবায় ফিরুন</Link>
      <div className="detail-grid">
        <section className="product-detail">
          <span className="service-icon service-icon-large"><ServiceIcon kind={product.icon} /></span>
          <p className="eyebrow">{product.category} · নমুনা প্ল্যান</p>
          <h1>{product.name}</h1>
          <p className="page-intro">{product.description}</p>
          <div className="detail-content">
            <h2>এই প্ল্যানে যা থাকছে</h2>
            <ul className="check-list">{product.includes.map((item) => <li key={item}><CheckIcon />{item}</li>)}</ul>
          </div>
          <div className="detail-content">
            <h2>সেবা দেওয়ার নিয়ম</h2>
            <p>{product.deliveryNote}</p>
            <p>সেবা চালু হলে পেমেন্ট যাচাইয়ের পর কাজ শুরু হবে। নির্দিষ্ট সময় আগে আলোচনা করে ঠিক করা হবে।</p>
          </div>
        </section>
        <aside className="summary-card" aria-labelledby="plan-heading">
          <span className="sample-pill">নমুনা মূল্য</span>
          <h2 id="plan-heading">প্ল্যানের সারাংশ</h2>
          <p>{product.name}</p>
          <strong className="detail-price">{formatTaka(product.pricePoisha)}</strong>
          <p className="muted">{product.unit}</p>
          <div className="summary-divider" />
          <p className="summary-note">এটি চূড়ান্ত অফার নয়। এখন পেমেন্ট করবেন না।</p>
          <Link href={`/checkout?product=${product.slug}`} className="button button-primary button-full">চেকআউট দেখুন <ArrowIcon /></Link>
          <p className="summary-footnote">এখন শুধু ফর্মের নমুনা দেখা যাবে।</p>
        </aside>
      </div>
    </div>
  );
}
