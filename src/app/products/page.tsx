import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { catalog } from "@/lib/catalog";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "সেবা ও প্ল্যান" };

export default async function ProductsPage() {
  const { products, sample } = await catalog();
  return (
    <section className="container page-space">
      <div className="page-heading">
        <p className="eyebrow">যেটি আপনার কাজে লাগে</p>
        <h1>সেবা ও প্ল্যান</h1>
        <p className="page-intro">
          প্রতিটি সেবায় কী থাকছে, কত লাগবে ও কীভাবে পাবেন—আগে দেখে নিন।
        </p>
      </div>
      <div className="section-heading">
        <h2 className="small-heading">সেবা ও প্ল্যান</h2>
        {sample && (
          <span className="sample-pill">নমুনা · মূল্য চূড়ান্ত নয়</span>
        )}
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} sample={sample} />
        ))}
      </div>
      {products.length === 0 && (
        <p className="notice">নতুন সেবা শিগগিরই যুক্ত হবে।</p>
      )}
      <p className="listing-note">
        কোনো তৈরি অ্যাকাউন্ট বা শেয়ার করা লগইন বিক্রি করা হবে না।
      </p>
    </section>
  );
}
