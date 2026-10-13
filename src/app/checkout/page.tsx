import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout-flow";
import { ArrowIcon } from "@/components/icons";
import { catalog } from "@/lib/catalog";
import { checkoutSettings } from "@/lib/config";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "চেকআউট" };
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string | string[] }>;
}) {
  const slug = (await searchParams).product;
  if (slug === undefined)
    return (
      <section className="container empty-page">
        <p className="eyebrow">চেকআউট</p>
        <h1>আগে একটি সেবা বেছে নিন</h1>
        <p>প্ল্যানের বিস্তারিত দেখে চেকআউট খুলতে পারবেন।</p>
        <Link className="button button-primary" href="/products">
          সেবা ও প্ল্যান দেখুন
        </Link>
      </section>
    );
  const { products, sample } = await catalog();
  const product =
    typeof slug === "string"
      ? products.find((p) => p.slug === slug)
      : undefined;
  if (!product) notFound();
  const settings = checkoutSettings();
  return (
    <div className="container page-space checkout-page">
      <Link className="back-link" href={"/products/" + product.slug}>
        <ArrowIcon /> প্ল্যানে ফিরুন
      </Link>
      <div className="page-heading">
        <p className="eyebrow">সেবা থেকে ডেলিভারি</p>
        <h1>চেকআউট</h1>
        <p className="page-intro">
          নিশ্চিত মূল্য দেখুন, bKash-এ পেমেন্ট করুন, তারপর লেনদেনের তথ্য জমা
          দিন।
        </p>
      </div>
      <ol className="checkout-steps" aria-label="অর্ডারের ধাপ">
        <li>১ · সেবা ও মূল্য</li>
        <li>২ · পেমেন্টের তথ্য</li>
        <li>৩ · যাচাই ও ডেলিভারি</li>
      </ol>
      <CheckoutFlow
        key={product.id}
        product={product}
        sample={sample}
        ordersOpen={settings.ordersOpen}
        siteKey={settings.siteKey}
      />
    </div>
  );
}
