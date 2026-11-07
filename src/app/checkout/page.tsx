import { headers } from "next/headers";
import { orderRuntime } from "@/lib/orders/runtime";
import { OrderForm } from "@/components/order-form";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutPreview } from "@/components/checkout-preview";
import { ArrowIcon, ServiceIcon } from "@/components/icons";
import { getMockProduct } from "@/data/mock-products";
import { formatTaka } from "@/lib/format";

export const metadata: Metadata = { title: "চেকআউটের নমুনা" };

type Props = { searchParams: Promise<{ product?: string | string[] }> };

export default async function CheckoutPage({ searchParams }: Props) {
  const slug = (await searchParams).product;
  if (slug === undefined) {
    return (
      <section className="container empty-page">
        <p className="eyebrow">চেকআউট</p>
        <h1>আগে একটি সেবা বেছে নিন</h1>
        <p>প্ল্যানের বিস্তারিত দেখে তার চেকআউটের নমুনা খুলতে পারবেন।</p>
        <Link className="button button-primary" href="/products">সেবা ও প্ল্যান দেখুন</Link>
      </section>
    );
  }

  // Only a known slug selects the sample. Any query-supplied price is ignored.
  const product = typeof slug === "string" ? getMockProduct(slug) : undefined;
  if (!product) notFound();

  // Preview checkouts are visual samples only; never initialize order services there.
  if (process.env.VERCEL_ENV !== "preview") {
    const { config, store } = orderRuntime();
    const liveProduct = await store.productBySlug(product.slug);
    if (liveProduct) {
      const nonce = (await headers()).get("x-nonce") ?? "";
      return (
        <div className="container page-space checkout-page">
          <h1>চেকআউট</h1>
          <div className="checkout-grid">
            <OrderForm key={liveProduct.id} productId={liveProduct.id} siteKey={config.NEXT_PUBLIC_TURNSTILE_SITE_KEY} nonce={nonce} />
            <aside className="summary-card"><h2>{liveProduct.name}</h2><p>সার্ভার নির্ধারিত মূল্য: ৳{liveProduct.priceBdt}</p><p>bKash প্রাপক: {config.BKASH_RECIPIENT_NUMBER}</p><p>এই মূল্য দেখে bKash-এ পেমেন্ট করে TrxID জমা দিন। পেমেন্ট ম্যানুয়ালি যাচাই হবে।</p></aside>
          </div>
        </div>
      );
    }
  }
  return (
    <div className="container page-space checkout-page">
      <Link className="back-link" href={`/products/${product.slug}`}><ArrowIcon /> প্ল্যানে ফিরুন</Link>
      <div className="page-heading"><p className="eyebrow">অর্ডার ফর্মের নমুনা</p><h1>চেকআউট</h1><p className="page-intro">সেবাটি দেখে ফর্মের নমুনা পূরণ করুন। এখন অর্ডার তৈরি বা পেমেন্ট করা যাবে না।</p></div>
      <div className="checkout-grid">
        <CheckoutPreview key={product.slug} />
        <aside className="summary-card checkout-summary" aria-labelledby="summary-heading">
          <h2 id="summary-heading">নির্বাচিত প্ল্যান</h2>
          <div className="selected-product"><span className="service-icon"><ServiceIcon kind={product.icon} /></span><div><h3>{product.name}</h3><p>{product.unit}</p></div></div>
          <div className="summary-divider" />
          <div className="price-row"><span>নমুনা মূল্য</span><strong>{formatTaka(product.pricePoisha)}</strong></div>
          <div className="notice">এই মূল্য চূড়ান্ত নয়। এখন কোনো নম্বরে টাকা পাঠাবেন না।</div>
          <p className="summary-note">অর্ডার চালু হলে নিশ্চিত মূল্য, bKash প্রাপকের নম্বর ও অর্ডার কোড দেখানো হবে।</p>
          <Link href="/refund" className="text-link">অর্থ ফেরত নীতির খসড়া দেখুন</Link>
        </aside>
      </div>
    </div>
  );
}
