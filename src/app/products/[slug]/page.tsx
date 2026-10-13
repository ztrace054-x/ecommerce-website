import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon, CheckIcon, ServiceIcon } from "@/components/icons";
import { catalog } from "@/lib/catalog";
import { formatPoisha } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { products } = await catalog();
  const slug = (await params).slug;
  const product = products.find((p) => p.slug === slug);
  return { title: product?.name ?? "সেবাটি পাওয়া যায়নি" };
}

export default async function ProductPage({ params }: Props) {
  const { products, sample } = await catalog();
  const slug = (await params).slug;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  return (
    <div className="container page-space">
      <Link href="/products" className="back-link">
        <ArrowIcon /> সব সেবায় ফিরুন
      </Link>
      <div className="detail-grid">
        <section className="product-detail">
          <span className="service-icon service-icon-large">
            <ServiceIcon kind={product.icon} />
          </span>
          <p className="eyebrow">
            {product.category}
            {sample ? " · নমুনা প্ল্যান" : ""}
          </p>
          <h1>{product.name}</h1>
          <p className="page-intro">{product.description}</p>
          <div className="detail-content">
            <h2>এই প্ল্যানে যা থাকছে</h2>
            <ul className="check-list">
              {product.includes.map((item) => (
                <li key={item}>
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="detail-content">
            <h2>সেবা দেওয়ার নিয়ম</h2>
            <p>{product.deliveryNote}</p>
            <p>সময়: {product.duration}</p>
            <p>ডেলিভারি: {product.deliveryMethod}</p>
          </div>
          <div className="detail-content">
            <h2>সেবার শর্ত</h2>
            <p>{product.terms}</p>
          </div>
        </section>
        <aside className="summary-card" aria-labelledby="plan-heading">
          <span className="sample-pill">
            {sample ? "নমুনা মূল্য" : "সেবার মূল্য"}
          </span>
          <h2 id="plan-heading">প্ল্যানের সারাংশ</h2>
          <p>{product.name}</p>
          <strong className="detail-price">
            {formatPoisha(product.pricePoisha)}
          </strong>
          <p className="muted">{product.unit}</p>
          <div className="summary-divider" />
          <p className="summary-note">
            {sample
              ? "এটি চূড়ান্ত অফার নয়। এখন পেমেন্ট করবেন না।"
              : "চেকআউটের নির্দেশনা দেখে পেমেন্ট করুন। হাতে যাচাইয়ের পরে সেবা দেওয়া হবে।"}
          </p>
          <Link
            href={`/checkout?product=${product.slug}`}
            className="button button-primary button-full"
          >
            চেকআউট দেখুন <ArrowIcon />
          </Link>
          <p className="summary-footnote">
            অ্যাকাউন্টের পাসওয়ার্ড দিতে হবে না।
          </p>
        </aside>
      </div>
    </div>
  );
}
