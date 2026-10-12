import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { mockProducts } from "@/data/mock-products";

export const metadata: Metadata = { title: "সেবা ও প্ল্যান" };

export default function ProductsPage() {
  return (
    <section className="container page-space">
      <div className="page-heading">
        <p className="eyebrow">যেটি আপনার কাজে লাগে</p>
        <h1>সেবা ও প্ল্যান</h1>
        <p className="page-intro">প্রতিটি সেবায় কী থাকছে, আগে দেখে নিন। সবগুলোই আপাতত নমুনা; এখন কোনো অর্ডার নেওয়া হচ্ছে না।</p>
      </div>
      <div className="section-heading"><h2 className="small-heading">সেবার নমুনা</h2><span className="sample-pill">মূল্য চূড়ান্ত নয়</span></div>
      <div className="product-grid">{mockProducts.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      <p className="listing-note">কোনো তৈরি অ্যাকাউন্ট বা শেয়ার করা লগইন বিক্রি করা হবে না।</p>
    </section>
  );
}
